export const THEME_COLORS = {
  bg: '#080A0D',
  surface: '#0E1217',
  surfaceRaised: '#141920',
  cards: '#181F28',
  cardsHover: '#202936',
  border: '#242C37',
  borderSubtle: '#1B212A',
  borderHover: '#3D4B5C',
  primary: '#FF6B00',
  primaryHover: '#FF8533',
  primaryGlow: 'rgba(255, 107, 0, 0.25)',
  accent: '#FF9F43',
  amber: '#F59E0B',
  amberGlow: 'rgba(245, 158, 11, 0.2)',
  emerald: '#10B981',
  emeraldGlow: 'rgba(16, 185, 129, 0.2)',
  text: '#F5F5F5',
  muted: '#8B949E',
  dim: '#5C6370',
  success: '#10B981',
  warning: '#F59E0B',
  danger: '#EF4444',
};

export interface AttackSimStep {
  text: string;
  type: 'info' | 'warn' | 'success' | 'exec' | 'exploit';
  delayMs?: number;
}

export interface HintItem {
  id: number;
  hint_level: number;
  hint_text: string;
  point_penalty?: number;
}

export interface StageInfo {
  stage: number;
  name: string;
  domain: string;
  difficulty: 'Easy' | 'Medium' | 'Hard';
  type: 'Static' | 'Docker' | 'VM' | 'VMs';
  points: number;
  targetSystem: string;
  subsystemCode: string;
  storyBrief: string;
  attackVector: string;
  vectorSummary: string;
  attackSimSteps: AttackSimStep[];
  port?: string;
  statusCheck: string;
  accessGuide: string;
  hints: HintItem[];
}

export const STAGE_CONFIGS: Record<number, StageInfo> = {
  1: {
    stage: 1,
    name: 'NexaCorp Reconnaissance',
    domain: 'OSINT',
    difficulty: 'Easy',
    type: 'Static',
    points: 100,
    targetSystem: 'NexaCorp Public Portal & DMZ Gateway',
    subsystemCode: 'NEXA-DMZ-01',
    storyBrief: 'The ShadowNet collective begins its campaign against NexaCorp by mapping its public-facing footprint. Analyze the exposed corporate web perimeter, inspect leaked metadata, and crawl employee directories to extract initial operative intelligence.',
    attackVector: 'OSINT Reconnaissance & Metadata Harvesting',
    vectorSummary: 'Probe NexaCorp public web servers, inspect hidden HTTP headers, and extract embedded author metadata from public documents.',
    attackSimSteps: [
      { text: '[RECON] Probing external target perimeter: nexacorp.com / DMZ-01', type: 'info' },
      { text: '[DNS] Mapping subdomains: auth.nexacorp.internal, cdn.nexacorp.com', type: 'info' },
      { text: '[SCAN] Scraping public employee directory & HTML comment blocks...', type: 'exec' },
      { text: '[EXIF] Found leaked PDF & image metadata with author credentials', type: 'warn' },
      { text: '[INTEL] Security policy breach detected! Perimeter flag extracted.', type: 'success' },
    ],
    port: '5000 (dashboard)',
    statusCheck: 'Port 5000 Active',
    accessGuide: 'Inspect public files, metadata and website headers for intelligence leaks.',
    hints: [
      {
        id: 101,
        hint_level: 1,
        hint_text: 'Inspect the HTML source comments and look for unscrubbed developer remarks containing internal deployment coordinates.',
        point_penalty: 40,
      },
      {
        id: 102,
        hint_level: 2,
        hint_text: 'Examine custom HTTP response headers returned by the server for exposed debugging keys and author metadata.',
        point_penalty: 40,
      },
    ],
  },
  2: {
    stage: 2,
    name: 'Covert Transmissions',
    domain: 'Steganography',
    difficulty: 'Medium',
    type: 'Static',
    points: 150,
    targetSystem: 'NexaCorp SIGINT Satellite Uplink & Decoy Array',
    subsystemCode: 'NEXA-SIGINT-02',
    storyBrief: 'A rogue NexaCorp insider smuggled out an encrypted surveillance transmission bundle before going silent. NexaCorp automated counter-measures flooded the frequency with 26 decoy jamming audio streams. Demodulate the authentic carrier wave and recover the whistleblower payload.',
    attackVector: 'Multi-Channel Audio Spectrogram Demodulation & Steganography',
    vectorSummary: 'Filter out 26 jamming decoy frequencies, analyze the authentic carrier audio spectrogram in audio analysis software, and decrypt hidden assets using passphrase "shelter".',
    attackSimSteps: [
      { text: '[SIGINT] Intercepting NexaCorp satellite burst transmission...', type: 'info' },
      { text: '[ALERT] 26 high-frequency jamming decoy channels detected!', type: 'warn' },
      { text: '[FFT] Performing Fast Fourier Transform spectrum analysis on 27 streams...', type: 'exec' },
      { text: '[LOCK] Whistleblower frequency identified at carrier band 14.2 MHz', type: 'warn' },
      { text: '[STEG] Demodulating covert audio spectrogram and parsing image payload', type: 'success' },
    ],
    port: 'N/A (Downloadable Package)',
    statusCheck: 'Package Available',
    accessGuide: 'Download the intercepted transmission package. Analyze the photographic exhibit using passphrase "shelter" to recover hidden intel, and inspect audio spectrograms.',
    hints: [
      {
        id: 201,
        hint_level: 1,
        hint_text: 'The whistleblower concealed an encrypted document inside the drone photo exhibit. Use the bunker emergency codeword "shelter" as the steganography extraction passphrase.',
        point_penalty: 40,
      },
      {
        id: 202,
        hint_level: 2,
        hint_text: 'Out of the 27 audio files, carrier channel 14 carries the authentic signal. Analyze its frequency spectrogram in an audio analysis tool to visually read the hidden flag.',
        point_penalty: 40,
      },
    ],
  },
  3: {
    stage: 3,
    name: 'Cipher Oracle',
    domain: 'Cryptography',
    difficulty: 'Medium',
    type: 'Docker',
    points: 200,
    targetSystem: 'NexaCorp Hardware Cryptographic Security Module',
    subsystemCode: 'NEXA-CRYPTO-03',
    storyBrief: 'ShadowNet has established a raw TCP socket connection to NexaCorp’s internal cryptographic oracle daemon. The service encrypts user-supplied input alongside an ultra-secret executive key. Exploit chosen-ciphertext differential byte leakage to reconstruct the master key.',
    attackVector: 'Chosen-Plaintext Byte-at-a-Time Oracle Attack',
    vectorSummary: 'Craft differential padding strings over TCP port 5000, align block boundaries, and recover the cipher key one byte at a time.',
    attackSimSteps: [
      { text: '[TCP] Establishing raw socket uplink to oracle daemon on port 5000...', type: 'info' },
      { text: '[ORACLE] Service responding: AES-ECB / Vigenère hybrid mode active', type: 'info' },
      { text: '[PROBE] Sending differential chosen-plaintext boundary probe...', type: 'exec' },
      { text: '[LEAK] Byte misalignment detected in ciphertext output stream', type: 'warn' },
      { text: '[SOLVE] Master cryptographic key recovered byte-by-byte!', type: 'success' },
    ],
    port: '5000',
    statusCheck: 'Port 5000 Active',
    accessGuide: 'Connect via raw TCP socket to interact with the encryption oracle daemon.',
    hints: [
      {
        id: 301,
        hint_level: 1,
        hint_text: 'The encryption oracle operates in Electronic Codebook (ECB) mode, meaning identical plaintext 16-byte blocks always produce identical ciphertext blocks.',
        point_penalty: 40,
      },
      {
        id: 302,
        hint_level: 2,
        hint_text: 'Supply crafted padding to push one secret character at a time into the last byte of a target block, allowing you to guess and recover the key byte-by-byte.',
        point_penalty: 40,
      },
    ],
  },
  4: {
    stage: 4,
    name: 'NexaAuth Portal Bypass',
    domain: 'Web Security',
    difficulty: 'Medium',
    type: 'Docker',
    points: 250,
    targetSystem: 'NexaCorp Employee SSO & Central Auth Gateway',
    subsystemCode: 'NEXA-AUTH-04',
    storyBrief: 'The collective arrives at NexaCorp’s internal Single Sign-On gateway. The login endpoint interacts with a backend SQL database using unsanitized string formatting. Construct a crafted SQL injection query to bypass corporate authentication as administrator.',
    attackVector: 'Authentication Bypass via Tautology SQL Injection',
    vectorSummary: 'Inject crafted authentication strings into the NexaCorp SSO login parameters to force an unauthenticated admin session token.',
    attackSimSteps: [
      { text: '[HTTP] Connecting to NexaCorp SSO gateway on port 3000...', type: 'info' },
      { text: '[FUZZ] Testing authentication payload against login endpoint...', type: 'exec' },
      { text: '[SQL] Backend query syntax broken: unsanitized input concatenated', type: 'warn' },
      { text: '[BYPASS] Database tautology true: SQL parser returns root record', type: 'warn' },
      { text: '[AUTH] 200 OK — Admin session established. Internal dashboard unlocked!', type: 'success' },
    ],
    port: '3000',
    statusCheck: 'Port 3000 Active',
    accessGuide: 'Target the SQL injection vulnerability on the internal employee login gateway endpoint.',
    hints: [
      {
        id: 401,
        hint_level: 1,
        hint_text: 'The login query uses string concatenation for the username parameter. Injecting quote characters breaks the SQL syntax and allows adding custom logic conditions.',
        point_penalty: 40,
      },
      {
        id: 402,
        hint_level: 2,
        hint_text: 'Use an OR condition that is always true combined with comment delimiters to bypass the password verification check and sign in as administrator.',
        point_penalty: 40,
      },
    ],
  },
  5: {
    stage: 5,
    name: 'PRNG Token Predictor',
    domain: 'Scripting',
    difficulty: 'Medium',
    type: 'Docker',
    points: 300,
    targetSystem: 'NexaCorp Dynamic Token Engine & Session Synchronizer',
    subsystemCode: 'NEXA-PRNG-05',
    storyBrief: 'NexaCorp uses an automated session token dispenser running on TCP port 5001. The token generator relies on a flawed Linear Congruential Generator (LCG) pseudo-random algorithm. Sample consecutive outputs, compute the internal state parameters, and predict future session keys.',
    attackVector: 'LCG Mathematical State Recovery & Sequence Forecasting',
    vectorSummary: 'Sample consecutive pseudo-random states over TCP netcat, solve for multiplier a and increment c, and predict the next security challenge token.',
    attackSimSteps: [
      { text: '[TCP] Connecting to Token Stream Service on port 5001...', type: 'info' },
      { text: '[STREAM] Intercepted consecutive 64-bit pseudo-random token states', type: 'info' },
      { text: '[MATH] Solving Linear Congruential state parameters...', type: 'exec' },
      { text: '[STATE] Modulus and seed state successfully synchronized!', type: 'warn' },
      { text: '[EXPLOIT] Future challenge token predicted with mathematical precision!', type: 'success' },
    ],
    port: '5001',
    statusCheck: 'Port 5001 Active',
    accessGuide: 'Connect to the token stream and predict upcoming pseudo-random security tokens.',
    hints: [
      {
        id: 501,
        hint_level: 1,
        hint_text: 'The token generator generates numbers using a standard Linear Congruential Generator recurrence formula with fixed multiplier and increment constants.',
        point_penalty: 40,
      },
      {
        id: 502,
        hint_level: 2,
        hint_text: 'Collecting several consecutive numbers from the stream lets you solve a system of linear congruences to deduce the modulus, multiplier, and next output token.',
        point_penalty: 40,
      },
    ],
  },
  6: {
    stage: 6,
    name: 'Binary Disassembly',
    domain: 'Reverse Engineering',
    difficulty: 'Hard',
    type: 'Docker',
    points: 350,
    targetSystem: 'NexaCorp Proprietary Defense Daemon (x86_64 ELF)',
    subsystemCode: 'NEXA-RE-06',
    storyBrief: 'Operatives have retrieved a compiled binary running on NexaCorp’s internal security gateway. The binary contains proprietary verification routines with anti-debugging traps. Decompile the ELF executable in Ghidra/GDB to reverse engineer the internal license algorithm.',
    attackVector: 'Static Decompilation & Dynamic Binary Flow Analysis',
    vectorSummary: 'Analyze the target binary in a disassembler, inspect assembly branch conditions, and extract the internal encryption algorithm.',
    attackSimSteps: [
      { text: '[SSH] Uplink established to isolated Reverse Engineering Sandbox container', type: 'info' },
      { text: '[ELF] Loading target binary into disassembler engine: x86_64 Linux', type: 'info' },
      { text: '[ASM] Disassembling authorization subroutine at virtual entry...', type: 'exec' },
      { text: '[FLOW] Identified cipher transform and stack comparison check', type: 'warn' },
      { text: '[PATCH] Verification logic reversed! Generated valid serial payload.', type: 'success' },
    ],
    port: '2222 (SSH)',
    statusCheck: 'Port 2222 Active',
    accessGuide: 'Connect via SSH: ssh -p 2222 player@localhost (Password: password123) or copy binary: scp -P 2222 player@localhost:~/challenges/stage6/target.bin ./',
    hints: [
      {
        id: 601,
        hint_level: 1,
        hint_text: 'Decompile the binary and locate the key validation function. Look at how user input is iterated over in a loop.',
        point_penalty: 40,
      },
      {
        id: 602,
        hint_level: 2,
        hint_text: 'The verification logic applies a symmetric bitwise XOR transformation to your input. Reversing the static reference array reveals the expected key.',
        point_penalty: 40,
      },
    ],
  },
  7: {
    stage: 7,
    name: 'Privilege Escalation',
    domain: 'Linux Security',
    difficulty: 'Hard',
    type: 'VM',
    points: 400,
    targetSystem: 'NexaCorp Production Linux Host (Bastion)',
    subsystemCode: 'NEXA-ROOT-07',
    storyBrief: 'ShadowNet holds low-privileged shell access on a central NexaCorp server. Enumerate system binaries, misconfigured SUID permissions, and unquoted PATH vulnerabilities to escalate execution to UID 0 (root).',
    attackVector: 'SUID Misconfiguration & Environment Hijacking PrivEsc',
    vectorSummary: 'Enumerate local SUID files, spot custom NexaCorp maintenance utilities, and exploit unquoted binary calls to spawn a root shell.',
    attackSimSteps: [
      { text: '[SHELL] Authenticated as unprivileged system operative user', type: 'info' },
      { text: '[ENUM] Scanning filesystem for misconfigured SUID binaries...', type: 'exec' },
      { text: '[TARGET] Located custom NexaCorp SUID backup utility', type: 'warn' },
      { text: '[HIJACK] Exploiting relative executable execution path in SUID wrapper...', type: 'exec' },
      { text: '[PWN] Elevated execution confirmed: UID 0 (root) shell active', type: 'success' },
    ],
    port: 'SSH',
    statusCheck: 'SSH Bastion Active',
    accessGuide: 'Log in to the Linux target machine, identify vulnerable SUID binaries, and escalate privileges to root.',
    hints: [
      {
        id: 701,
        hint_level: 1,
        hint_text: 'Search for executables owned by root that have the setuid permission bit enabled across the local filesystem.',
        point_penalty: 40,
      },
      {
        id: 702,
        hint_level: 2,
        hint_text: 'Inspect the strings and system calls in the custom backup binary to check if it calls sub-utilities without full absolute paths, enabling PATH environment hijacking.',
        point_penalty: 40,
      },
    ],
  },
  8: {
    stage: 8,
    name: 'Core Infrastructure Breach',
    domain: 'Network Pivoting',
    difficulty: 'Hard',
    type: 'VMs',
    points: 500,
    targetSystem: 'NexaCorp Crown Jewels: Core Datacenter & Internal MySQL',
    subsystemCode: 'NEXA-CORE-08',
    storyBrief: 'The final capstone operation. NexaCorp’s internal MySQL database containing its most sensitive corporate records is completely isolated from the internet. Exploit a Server-Side Request Forgery (SSRF) flaw on the entry host to pivot across the internal network, query the metadata service, and dump the database.',
    attackVector: 'SSRF Perimeter Pivoting & Internal DB Exfiltration',
    vectorSummary: 'Exploit SSRF on Entry Host to pivot across internal subnets, query cloud metadata, retrieve DB credentials, and dump the master table.',
    attackSimSteps: [
      { text: '[ENTRY] Exploiting SSRF parameter on Entry Host gateway...', type: 'info' },
      { text: '[PIVOT] Forging internal HTTP request to cloud metadata daemon...', type: 'exec' },
      { text: '[CRED] Exfiltrated internal database credentials from metadata', type: 'warn' },
      { text: '[SQL] Tunneling queries to isolated internal MySQL host...', type: 'exec' },
      { text: '[EXFIL] NexaCorp Crown Jewels breached! Flag extracted.', type: 'success' },
    ],
    port: 'SSH/HTTP',
    statusCheck: 'Subnet Cluster Active',
    accessGuide: 'Exploit the SSRF vulnerability on the entry host to pivot to internal metadata services and dump the core MySQL database.',
    hints: [
      {
        id: 801,
        hint_level: 1,
        hint_text: 'The entry web portal accepts URL inputs that can be manipulated to make internal HTTP requests to the local cloud link-local metadata address.',
        point_penalty: 40,
      },
      {
        id: 802,
        hint_level: 2,
        hint_text: 'Extract the database connection credentials from the metadata endpoint, then use network pivoting or port forwarding to authenticate to the isolated internal MySQL server.',
        point_penalty: 40,
      },
    ],
  },
};
