interface NavetRuntimeConfig {
  runtime?: 'ha-ingress';
  hassUrl?: string;
  dashboardConfigUrl?: string;
  proxyBaseUrl?: string;
}

interface Window {
  __NAVET_CONFIG__?: NavetRuntimeConfig;
}
