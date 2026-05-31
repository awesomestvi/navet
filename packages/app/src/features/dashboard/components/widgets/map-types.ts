export interface MapMarker {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  entityPicture?: string;
  state: string;
  gpsAccuracy?: number;
}
