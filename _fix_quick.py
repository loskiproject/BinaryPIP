with open('src/features/FundsHub.tsx', 'r', encoding='utf-8') as f:
    c = f.read()
c = c.replace('QUICK.map(q =>', 'quickAmounts.map(q =>')
with open('src/features/FundsHub.tsx', 'w', encoding='utf-8') as f:
    f.write(c)
print('done')
