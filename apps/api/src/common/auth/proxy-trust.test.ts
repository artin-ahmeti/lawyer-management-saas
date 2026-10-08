import { createRequire } from 'node:module';
import { expect, it } from 'vitest';

// Resolve the actual dependency used by Nest's Express adapter, not an unrelated direct installation.
const platform = createRequire(require.resolve('@nestjs/platform-express'));
const express = createRequire(platform.resolve('express'));
const proxyAddress = express('proxy-addr') as {
  compile(subnets: string[]): (address: string, hop: number) => boolean;
};

it('does not trust arbitrary IPv4 peers through a malformed IPv4-mapped IPv6 subnet', () => {
  // Maintainer regression: https://github.com/jshttp/proxy-addr/security/advisories/GHSA-jqcg-44mw-7w3h
  expect(proxyAddress.compile(['::ffff:10.0.0.0/8'])('203.0.113.7', 0)).toBe(false);
  const trusted = proxyAddress.compile(['10.0.0.0/8']);
  expect(trusted('10.1.2.3', 0)).toBe(true);
  expect(trusted('203.0.113.7', 0)).toBe(false);
});
