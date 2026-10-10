with open('src/admin/AdminDashboard.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# Find end of gateway section (just before SETTINGS comment) and insert deposit limits panel
old = '          {/* \u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550 SETTINGS \u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550 */}'

# Find the closing of gateway section
gateway_close = '            </div>\n          )}\n\n          {/* \u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550 SETTINGS'

new_panel = '''            {/* Deposit Limits Panel */}
            <div className="sa-panel" style={{ marginTop: '16px' }}>
              <div className="sa-panel-head" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}><DollarSign size={14} /> Deposit & Withdrawal Limits</span>
                {settingsSaved && <span style={{ fontSize: '11px', color: '#1ccf84' }}>✓ Saved</span>}
              </div>
              <div style={{ padding: '16px 18px', display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '14px', alignItems: 'end' }}>
                <label className="sa-label">
                  Min Crypto Deposit (USD)
                  <input className="sa-input" type="number" min="1" value={settingsDraft.minUSD}
                    onChange={e => setSettingsDraft(d => ({ ...d, minUSD: e.target.value }))} />
                  <span style={{ fontSize: '10.5px', color: 'var(--sa-muted)', marginTop: '3px', display: 'block' }}>Current: ${minDepositUSD}</span>
                </label>
                <label className="sa-label">
                  Min M-Pesa Deposit (KES)
                  <input className="sa-input" type="number" min="1" value={settingsDraft.minKES}
                    onChange={e => setSettingsDraft(d => ({ ...d, minKES: e.target.value }))} />
                  <span style={{ fontSize: '10.5px', color: 'var(--sa-muted)', marginTop: '3px', display: 'block' }}>Current: KES {minDepositKES}</span>
                </label>
                <label className="sa-label">
                  Min Withdrawal (USD)
                  <input className="sa-input" type="number" min="1" value={settingsDraft.minWithdraw}
                    onChange={e => setSettingsDraft(d => ({ ...d, minWithdraw: e.target.value }))} />
                  <span style={{ fontSize: '10.5px', color: 'var(--sa-muted)', marginTop: '3px', display: 'block' }}>Current: ${minWithdrawalUSD}</span>
                </label>
                <button className="sa-btn sa-btn-primary" style={{ gridColumn: '1/-1' }}
                  onClick={() => {
                    const usd = parseFloat(settingsDraft.minUSD)
                    const kes = parseFloat(settingsDraft.minKES)
                    const wit = parseFloat(settingsDraft.minWithdraw)
                    if (!usd || !kes || !wit || usd < 1 || kes < 1 || wit < 1) { notify('All limits must be at least 1.', 'err'); return }
                    setMinDepositUSD(usd)
                    setMinDepositKES(kes)
                    setMinWithdrawalUSD(wit)
                    setSettingsSaved(true)
                    addAudit('UPDATE_DEPOSIT_LIMITS', 'system', 'Settings', `Min deposit: $${usd} USD / KES ${kes}. Min withdrawal: $${wit}`, 'warning')
                    notify(`Limits updated: Min deposit $${usd} / KES ${kes}, Min withdrawal $${wit}.`)
                    setTimeout(() => setSettingsSaved(false), 3000)
                  }}>
                  <CheckCircle2 size={14} /> Apply Limits
                </button>
              </div>
            </div>
            </div>
          )}

          {/* \u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550 SETTINGS'''

if gateway_close in content:
    content = content.replace(gateway_close, new_panel, 1)
    print('OK: deposit limits panel added to gateway section')
else:
    print('NOT FOUND')
    # Try to find a nearby marker
    idx = content.find('SETTINGS')
    print('SETTINGS found at idx:', idx)

with open('src/admin/AdminDashboard.tsx', 'w', encoding='utf-8') as f:
    f.write(content)
print('Length:', len(content))
