# Voiceover: what to say, in order

Only the spoken lines from `script.md`, nothing else. Read one line, pause 2 to 3 seconds, read the next.
If you stumble, pause and re-read the whole line; do not stop the recording. Target pace: calm, about 2.5 words a second.
Seconds = how long the line has on screen. Numbers are spelled the way they should be said.

## 1. The problem (0:00 to 0:35)

**A1 · ERIC · 10 s**
Your vendor emails: "We have changed banks. Please send this month's payment to our new account." Same name, same invoice. Pay it, and the money goes to whoever sent it.

**A2 · SAKETH · 13 s**
Business email compromise hit about three in four organizations in 2025. Of the companies hit by payments fraud, only three in ten got most of it back. One in five got nothing. Losses reported to the FBI: over three billion dollars.

**A3 · SAKETH · 8 s**
The old fix still works: call the vendor back on the number you already have. The scammer controls the email. Not the vendor's phone.

**A4 · ERIC · 4 s**
So we automated the call.

## 2. The demo (0:35 to 1:10)

**B1 · ERIC · 10 s**
This is Rice Robotics' accounts payable. I'm sending the scam email now, through the same code path a real email takes.

**B2 · ERIC · 16 s**
Claude reads it and flags the bank change, and the rules flag it too. Both Acme bills, twenty-four thousand eight hundred dollars, go on hold. Ramp is a mock here, built against Ramp's Developer API.

**B3 · ERIC · 9 s**
It never dials a number from the email. It calls the one on Acme's W-9 from March 2025, the number we already had.

## 3. The real call (1:10 to 2:12)

No voiceover. The hero take plays with its own audio.

## 4. After the call (2:12 to 3:02)

**D1 · SAKETH · 8 s**
Acme says no. The case is blocked, and the twenty-four eight stays on hold.

**D2 · SAKETH · 7 s**
Only a signed-in person can release money, by holding this button. Never the model.

**D3 · SAKETH · 7 s**
Every step lands in one append-only log, and the audit page rebuilds every case from it.

**E1 · SAKETH · 7 s**
Voicemail: the agent says nothing about the request, and a person gets a task.

**E2 · SAKETH · 6 s**
"I think so?" isn't a yes. Still held, and a person follows up.

**E3 · SAKETH · 8 s**
Someone says yes, but can't give the right digits? Held, and sent to a person.

**E4 · SAKETH · 7 s**
And when every check passes, the money still waits for a person.

## 5. How it works (3:02 to 3:57)

**F1 · DANIEL · 13 s**
One Next.js app. Email arrives by a signed webhook, Claude returns typed JSON, and Retell places the call. The number in the email never reaches the dialer.

**F2 · DANIEL · 15 s**
The models only report. Plain TypeScript decides: an unhandled outcome won't compile. "Confirmed" needs the right digits, no red flags, and a second reader that agrees. Even then, only a signed-in person releases the money.

**F3 · DANIEL · 11 s**
On our twenty hand-built emails, the live model got twenty of twenty, with no false alarms. With the model switched off, the rules alone still hold every bank change.

**F4 · DANIEL · 16 s**
We check the policy exhaustively: almost twenty-one million cases, zero unsafe releases. A seeded simulator loses, repeats and forges webhooks. It has found two real bugs. And the audit log is sealed, entry by entry, so a changed record shows up.

## 6. Close (3:57 to 4:12)

**G1 · ERIC, then DANIEL · 7 s** (Saketh can take either half)
ERIC: The old way depends on someone remembering to make a phone call.
DANIEL: CounterCall makes it, every time.

(G2, end card: no voiceover.)

## Who reads what

Three voices: Eric, Saketh, Daniel. Each person records only their own lines, in one session; the files are cut into place in the edit.

- **Eric** (setup and live demo, about 52 s): A1, A4, B1, B2, B3, G1 first half.
- **Saketh** (stats and everything after the call, about 71 s): A2, A3, D1, D2, D3, E1, E2, E3, E4.
- **Daniel** (how it works, about 58 s): F1, F2, F3, F4, G1 second half.

Use the same kind of mic and room for all three if you can, so the voices match.
