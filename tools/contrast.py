def lin(c):
    c/=255; return c/12.92 if c<=0.03928 else ((c+0.055)/1.055)**2.4
def L(h):
    h=h.lstrip('#'); r,g,b=[int(h[i:i+2],16) for i in (0,2,4)]
    return 0.2126*lin(r)+0.7152*lin(g)+0.0722*lin(b)
def cr(a,b):
    la,lb=L(a),L(b); 
    if la<lb: la,lb=lb,la
    return (la+0.05)/(lb+0.05)
paper='#E9E6DE'; paper0='#F4F2EC'; ink='#14161D'; inkdark='#12141A'
pairs=[
 ('ink on paper',ink,paper),
 ('ink-600 #4A4F5E on paper','#4A4F5E',paper),
 ('ink-500 #5C6170 on paper','#5C6170',paper),
 ('ink-500 on paper0','#5C6170',paper0),
 ('paper on ink',paper,ink),
 ('paper-dim #A9A79F on ink','#A9A79F',ink),
 ('signal #1B4DFF on paper','#1B4DFF',paper),
 ('white on signal','#FFFFFF','#1B4DFF'),
 ('paper0 on signal',paper0,'#1B4DFF'),
 ('signal-lite #7C9BFF on ink','#7C9BFF',ink),
 ('held ink on amber #FFB020','#14161D','#FFB020'),
 ('held text #8A5A00 on paper','#8A5A00',paper),
 ('verified text #0E7A3E on paper','#0E7A3E',paper),
 ('verified fill #19A25A w/ ink','#14161D','#19A25A'),
 ('blocked fill #E5311A w/ paper0',paper0,'#E5311A'),
 ('blocked text #C42410 on paper','#C42410',paper),
 ('review fill #D13F9B w/ ink','#14161D','#D13F9B'),
 ('review text #A8206F on paper','#A8206F',paper),
 ('verified on ink #3DDC84','#3DDC84',ink),
 ('blocked on ink #FF5A45','#FF5A45',ink),
 ('held on ink #FFB020','#FFB020',ink),
 ('review on ink #FF6FC0','#FF6FC0',ink),
 ('calling on ink #6C8CFF','#6C8CFF',ink),
]
for n,f,b in pairs: print(f"{cr(f,b):5.2f}  {n}")
