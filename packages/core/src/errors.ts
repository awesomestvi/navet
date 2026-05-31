export class ProviderContractError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ProviderContractError';
  }
}

export class ProviderAuthRequiredError extends ProviderContractError {
  constructor(message = 'Provider authentication is required before connecting') {
    super(message);
    this.name = 'ProviderAuthRequiredError';
  }
}

export class ProviderUnavailableError extends ProviderContractError {
  constructor(message = 'Provider is unavailable') {
    super(message);
    this.name = 'ProviderUnavailableError';
  }
}

export class UnsupportedProviderCommandError extends ProviderContractError {
  constructor(commandType: string) {
    super(`Provider command is not supported yet: ${commandType}`);
    this.name = 'UnsupportedProviderCommandError';
  }
}
