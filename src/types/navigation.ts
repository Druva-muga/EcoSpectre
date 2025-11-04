import { SustainabilityScore, ScanContext, ScanRecord } from './index';

export type RootStackParamList = {
  Auth: undefined;
  Login: undefined;
  Signup: undefined;
  Main: undefined;
  Camera: undefined;
  Processing: { imageUri: string };
  Result: { scanRecord: ScanRecord };
  Settings: undefined;
};

export type MainTabParamList = {
  Home: undefined;
  History: undefined;
  Profile: undefined;
};

declare global {
  namespace ReactNavigation {
    interface RootParamList extends RootStackParamList {}
  }
}