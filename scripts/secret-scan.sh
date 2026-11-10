#!/usr/bin/env bash
# scripts/secret-scan.sh (npm run scan:secrets): fails if a key, webhook secret, DB URL with a password, or an
# unmasked E.164 phone number is tracked in git, or if the lockfile resolves anything outside the public npm registry.
# Pattern list from 08 §6 plus phones. Prints only file:line, never the matched value.
set -euo pipefail
cd "$(git rev-parse --show-toplevel)"
fail=0
keys='(sk-ant-[A-Za-z0-9_-]{10,}|re_[A-Za-z0-9]{20,}|key_[0-9a-f]{20,}|whsec_[A-Za-z0-9+/=]{24,}|postgres(ql)?://[^ :]*:[^ @]+@)'
if git grep -lIE "$keys" -- . ':!docs' ':!.env.example' ':!package-lock.json' ':!scripts/secret-scan.sh' >/dev/null; then
  echo "secret-scan: possible secret in:"; git grep -nIE "$keys" -- . ':!docs' ':!.env.example' ':!package-lock.json' ':!scripts/secret-scan.sh' | cut -d: -f1,2; fail=1
fi
# Real US numbers: +1 then 10 digits whose exchange is not 555-01xx (the fictional range used by fixtures).
phones='\+1[2-9][0-9]{2}[2-9][0-9]{6}'
hits=$(git grep -nIE "$phones" -- . ':!docs' ':!package-lock.json' ':!scripts/secret-scan.sh' | grep -vE '\+1[0-9]{3}555' || true)
if [ -n "$hits" ]; then echo "secret-scan: possible real phone number in:"; echo "$hits" | cut -d: -f1,2; fail=1; fi
if git ls-files | grep -E '(^|/)\.env($|\.)' | grep -vx '.env.example' >/dev/null; then echo "secret-scan: an .env file is tracked"; fail=1; fi
bad=$(grep '"resolved"' package-lock.json | grep -vc 'registry.npmjs.org' || true)
if [ "$bad" != "0" ]; then echo "secret-scan: $bad lockfile entries resolve outside registry.npmjs.org"; fail=1; fi
[ $fail = 0 ] && echo "secret-scan: clean"
exit $fail
