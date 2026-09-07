// Compatibility import surface; Homey transport and command ownership live in the provider.

export type {
  HomeyActionClient,
  HomeyCapabilityCommand,
  HomeySnapshotClient,
} from '@navet/provider-homey';
export {
  homeyService,
  translateHomeyCommand,
  translateHomeyServiceAction,
} from '@navet/provider-homey';
