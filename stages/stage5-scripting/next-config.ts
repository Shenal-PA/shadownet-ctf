import type { NextConfig } from 'next';

// Merge this include into the dashboard's existing config if it has one.
const config: NextConfig = {
  outputFileTracingIncludes: {
    '/api/stage5/download': ['./stages/stage5-scripting/stage5-starter.py'],
  },
};
export default config;
