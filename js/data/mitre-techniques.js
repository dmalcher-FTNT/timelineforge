/** Common MITRE ATT&CK techniques for IR timelines (subset). */
export const MITRE_TECHNIQUES = [
  { id: 'T1566', name: 'Phishing' },
  { id: 'T1566.001', name: 'Spearphishing Attachment' },
  { id: 'T1566.002', name: 'Spearphishing Link' },
  { id: 'T1078', name: 'Valid Accounts' },
  { id: 'T1059', name: 'Command and Scripting Interpreter' },
  { id: 'T1059.001', name: 'PowerShell' },
  { id: 'T1059.003', name: 'Windows Command Shell' },
  { id: 'T1021', name: 'Remote Services' },
  { id: 'T1021.001', name: 'Remote Desktop Protocol' },
  { id: 'T1021.004', name: 'SSH' },
  { id: 'T1071', name: 'Application Layer Protocol' },
  { id: 'T1572', name: 'Protocol Tunneling' },
  { id: 'T1090', name: 'Proxy' },
  { id: 'T1098', name: 'Account Manipulation' },
  { id: 'T1003', name: 'OS Credential Dumping' },
  { id: 'T1552', name: 'Unsecured Credentials' },
  { id: 'T1083', name: 'File and Directory Discovery' },
  { id: 'T1082', name: 'System Information Discovery' },
  { id: 'T1046', name: 'Network Service Discovery' },
  { id: 'T1027', name: 'Obfuscated Files or Information' },
  { id: 'T1036', name: 'Masquerading' },
  { id: 'T1070', name: 'Indicator Removal' },
  { id: 'T1562', name: 'Impair Defenses' },
  { id: 'T1486', name: 'Data Encrypted for Impact' },
  { id: 'T1490', name: 'Inhibit System Recovery' },
  { id: 'T1485', name: 'Data Destruction' },
  { id: 'T1489', name: 'Service Stop' },
  { id: 'T1048', name: 'Exfiltration Over Alternative Protocol' },
  { id: 'T1041', name: 'Exfiltration Over C2 Channel' },
  { id: 'T1020', name: 'Automated Exfiltration' },
  { id: 'T1547', name: 'Boot or Logon Autostart Execution' },
  { id: 'T1543', name: 'Create or Modify System Process' },
  { id: 'T1053', name: 'Scheduled Task/Job' },
  { id: 'T1136', name: 'Create Account' },
  { id: 'T1098.004', name: 'SSH Authorized Keys' },
  { id: 'T1219', name: 'Remote Access Software' },
  { id: 'T1105', name: 'Ingress Tool Transfer' },
  { id: 'T1204', name: 'User Execution' },
  { id: 'T1190', name: 'Exploit Public-Facing Application' },
  { id: 'T1133', name: 'External Remote Services' },
  { id: 'T1484', name: 'Domain or Tenant Policy Modification' },
  { id: 'T1484.001', name: 'Group Policy Modification' },
];

export function techniqueLabel(id) {
  if (!id) return '';
  const t = MITRE_TECHNIQUES.find((x) => x.id === id);
  return t ? `${t.id} — ${t.name}` : id;
}

export function inferTechnique(text) {
  const t = (text || '').toLowerCase();
  if (/phish|teams|spear/.test(t)) return 'T1566';
  if (/powershell/.test(t)) return 'T1059.001';
  if (/rdp|remote desktop/.test(t)) return 'T1021.001';
  if (/ssh/.test(t)) return 'T1021.004';
  if (/exfil/.test(t)) return 'T1041';
  if (/wiper|encrypt|ransom/.test(t)) return 'T1486';
  if (/gpo|group policy/.test(t)) return 'T1484.001';
  if (/credential|password steal/.test(t)) return 'T1003';
  if (/tunnel|cloudflare/.test(t)) return 'T1572';
  if (/netbird|remote access tool/.test(t)) return 'T1219';
  if (/scheduled task/.test(t)) return 'T1053';
  if (/edr|whitelist|impair/.test(t)) return 'T1562';
  return '';
}
