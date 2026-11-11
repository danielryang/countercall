#!/bin/sh
# scripts/check-ui.sh [dir...]  fails if UI code bypasses the design tokens (adapted from research/design/app/snippets/check-ui.sh:
# the original reads only $1, so `check-ui.sh app components lib` silently checked `app` alone; this one checks every argument and skips the shadcn-generated folder)
DIRS=${*:-app components lib}; BAD=0
chk(){ OUT=$(grep -rnE --exclude-dir=shadcn --include='*.tsx' --include='*.ts' --include='*.css' "$2" $DIRS 2>/dev/null | grep -vE 'globals\.css|tokens\.css'); [ -n "$OUT" ] && { echo "== $1"; echo "$OUT"; BAD=1; }; }
chk "raw colour literal (use semantic token)"  '#[0-9a-fA-F]{3,8}\b|rgba?\(|hsla?\('
chk "arbitrary radius (use rounded-sm/md/lg/xl tokens)"  'rounded-\[|border-radius'
chk "shadow/gradient (flat: tokens in app/globals.css only)"         '\bshadow(-[a-z0-9]+)?\b|box-shadow|bg-gradient|linear-gradient'
chk "transition-all"                             'transition-all|transition: *all'
chk "literal duration/ease (use motion tokens)"  '\b(duration|delay)-\[?[0-9]+|duration: *[0-9.]+|ease: *\[|transition=\{\{ *duration'
chk "tailwind default palette"                   '\b(bg|text|border|ring|fill|stroke)-(slate|gray|zinc|neutral|stone|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose)-[0-9]{2,3}\b'
chk "framer-motion import (use motion/react)"    "from ['\"]framer-motion['\"]"
exit $BAD
