import { Router, Request, Response, NextFunction } from 'express';
import mongoose from 'mongoose';
import jwt from 'jsonwebtoken';
import { Scan } from '../models/Scan';

const router = Router();
const memoryScans: any[] = [];
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';

// Optional auth: extract userId if token exists, otherwise continue
const optionalAuth = (req: Request, res: Response, next: NextFunction) => {
  const token = req.headers.authorization?.replace('Bearer ', '');
  if (token) {
    try {
      const decoded = jwt.verify(token, JWT_SECRET) as any;
      (req as any).userId = decoded.userId;
    } catch {}
  }
  next();
};

// Create scan (optional auth)
router.post('/', optionalAuth, async (req, res) => {
	try {
		const {
			score,
			breakdown,
			detected_labels,
			packaging_type,
			material_hints,
			ocr_text,
			brand_text,
			image_thumb,
			action,
			// Optional for now since we don't have auth wired
			userId,
		} = req.body;

		// Accept either: (1) score:number + breakdown:object OR (2) score:{ score:number, breakdown:object }
		let finalScore: number | undefined;
		let finalBreakdown:
			| { materials: number; packaging: number; certifications: number; category_baseline: number }
			| undefined;

		if (typeof score === 'number') {
			finalScore = score;
			if (breakdown && typeof breakdown === 'object') {
				finalBreakdown = breakdown;
			}
		} else if (score && typeof score === 'object') {
			finalScore = Number(score.score);
			if (score.breakdown && typeof score.breakdown === 'object') {
				finalBreakdown = score.breakdown;
			}
		}

		const missing: string[] = [];
		if (finalScore === undefined || Number.isNaN(finalScore)) missing.push('score');
		if (!finalBreakdown) missing.push('breakdown');
		if (!detected_labels) missing.push('detected_labels');
		if (!packaging_type) missing.push('packaging_type');
		if (!material_hints) missing.push('material_hints');
		if (!action) missing.push('action');
		if (missing.length > 0) {
			return res.status(400).json({ message: `Missing required fields: ${missing.join(', ')}` });
		}

		// Use authenticated userId if available, otherwise fallback to provided or guest
		const finalUserId = (req as any).userId || userId || '000000000000000000000000';

    // If DB is not connected, fall back to in-memory store so the app can proceed
    const isDbConnected = mongoose.connection.readyState === 1;
    if (!isDbConnected) {
        const id = new mongoose.Types.ObjectId().toString();
        const item = {
            _id: id,
            userId: finalUserId,
            timestamp: Date.now(),
            score: finalScore,
            breakdown: finalBreakdown,
            detected_labels,
            packaging_type,
            material_hints,
            ocr_text,
            brand_text,
            image_thumb,
            action,
        };
        memoryScans.unshift(item);
        return res.status(201).json({ id, storage: 'memory' });
    }

    const doc = await Scan.create({
        userId: finalUserId,
        timestamp: Date.now(),
        score: finalScore,
        breakdown: finalBreakdown,
        detected_labels,
        packaging_type,
        material_hints,
        ocr_text,
        brand_text,
        image_thumb,
        action,
    });

        return res.status(201).json({ id: doc._id.toString() });
	} catch (err: any) {
		console.error('[Scans] Create error:', err);
		return res.status(500).json({ message: err?.message || 'Internal server error' });
	}
});

// Get scans (optional auth - filters by userId if authenticated)
router.get('/', optionalAuth, async (req, res) => {
	try {
		const { startDate, endDate } = req.query as { startDate?: string; endDate?: string };
        const isDbConnected = mongoose.connection.readyState === 1;

        const authUserId = (req as any).userId;
        
        if (!isDbConnected) {
            // Serve from memory if DB is not connected
            const filtered = memoryScans.filter(d => {
                // Filter by userId if authenticated
                if (authUserId && d.userId !== authUserId) return false;
                const t = d.timestamp || 0;
                const after = startDate ? t >= new Date(startDate).getTime() : true;
                const before = endDate ? t <= new Date(endDate).getTime() : true;
                return after && before;
            });
            const mapped = filtered.map(d => ({
                id: d._id,
                timestamp: d.timestamp,
                score: {
                    score: d.score,
                    breakdown: d.breakdown,
                    top_factors: [],
                    suggestion: '',
                    disposal: '',
                },
                context: {
                    detected_labels: d.detected_labels,
                    packaging_type: d.packaging_type,
                    material_hints: d.material_hints,
                    ocr_text: d.ocr_text,
                    brand_text: d.brand_text,
                    image_thumb: d.image_thumb,
                    image: d.image_thumb,
                    user_note: '',
                },
                action: d.action,
            }));
            return res.json(mapped);
        }

        const query: any = {};
        // Filter by userId if authenticated
        if (authUserId) {
            query.userId = authUserId;
        }
		if (startDate || endDate) {
			query.timestamp = {};
			if (startDate) query.timestamp.$gte = new Date(startDate).getTime();
			if (endDate) query.timestamp.$lte = new Date(endDate).getTime();
		}
		const docs = await Scan.find(query).sort({ timestamp: -1 }).limit(100);
		const mapped = docs.map(d => ({
			id: d._id.toString(),
			timestamp: d.timestamp,
			score: {
				score: d.score,
				breakdown: d.breakdown,
				top_factors: [],
				suggestion: '',
				disposal: '',
			},
			context: {
				detected_labels: d.detected_labels,
				packaging_type: d.packaging_type,
				material_hints: d.material_hints,
				ocr_text: d.ocr_text,
				brand_text: d.brand_text,
				image_thumb: d.image_thumb,
				image: d.image_thumb,
				user_note: '',
			},
			action: d.action,
		}));
		return res.json(mapped);
	} catch (err: any) {
		console.error('[Scans] List error:', err);
		return res.status(500).json({ message: err?.message || 'Internal server error' });
	}
});

export default router;
