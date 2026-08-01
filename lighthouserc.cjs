module.exports = {
  ci: {
    collect: {
      staticDistDir: './apps/standalone/dist',
      numberOfRuns: 3,
    },
    assert: {
      assertions: {
        'categories:performance': ['error', { aggregationMethod: 'median', minScore: 0.8 }],
        'categories:best-practices': [
          'error',
          { aggregationMethod: 'median', minScore: 0.9 },
        ],
      },
    },
    upload: {
      target: 'temporary-public-storage',
    },
  },
};
