import { type CuratedRepo } from './types';

export const CYBERSECURITY_LEARNING_PATH: CuratedRepo[] = [
  // Beginner - Security Fundamentals
  {
    name: 'OWASP Top 10',
    url: 'https://owasp.org/www-project-top-ten/',
    description: 'Master the top 10 web application security risks - essential knowledge',
    language: 'Security',
    difficulty: 'Beginner',
    stars: 'OWASP',
    category: 'Security Fundamentals',
    icon: '🛡️',
    isProduction: true
  },
  {
    name: 'WebGoat',
    url: 'https://github.com/WebGoat/WebGoat',
    description: 'Deliberately insecure web application for learning - 7k+ stars',
    language: 'Java',
    difficulty: 'Beginner',
    stars: '7k+',
    category: 'Vulnerable App',
    icon: '🐐',
    isProduction: true
  },
  {
    name: 'DVWA (Damn Vulnerable Web App)',
    url: 'https://github.com/digininja/DVWA',
    description: 'PHP/MySQL vulnerable web app for learning - 8k+ stars',
    language: 'PHP',
    difficulty: 'Beginner',
    stars: '8k+',
    category: 'Vulnerable App',
    icon: '💀',
    isProduction: true
  },

  // Intermediate - Network Security
  {
    name: 'Wireshark',
    url: 'https://gitlab.com/wireshark/wireshark',
    description: 'Network protocol analyzer - 2k+ stars, gold standard for network analysis',
    language: 'C++',
    difficulty: 'Intermediate',
    stars: '2k+',
    category: 'Protocol Analysis',
    icon: '🔍',
    isProduction: true
  },
  {
    name: 'Nmap',
    url: 'https://github.com/nmap/nmap',
    description: 'Network discovery and security auditing - 8k+ stars, used by professionals',
    language: 'C++',
    difficulty: 'Intermediate',
    stars: '8k+',
    category: 'Network Scanner',
    icon: '🗺️',
    isProduction: true
  },
  {
    name: 'Burp Suite Community',
    url: 'https://portswigger.net/burp/communitydownload',
    description: 'Web application security testing - industry standard tool',
    language: 'Java',
    difficulty: 'Intermediate',
    stars: 'Industry',
    category: 'Web Security',
    icon: '🕷️',
    isProduction: true
  },

  // Advanced - Password Security & Cracking
  {
    name: 'Hashcat',
    url: 'https://github.com/hashcat/hashcat',
    description: 'World\'s fastest password recovery tool - 10k+ stars, GPU-accelerated',
    language: 'C++',
    difficulty: 'Advanced',
    stars: '10k+',
    category: 'Password Security',
    icon: '💥',
    isProduction: true
  },
  {
    name: 'John the Ripper',
    url: 'https://github.com/openwall/john',
    description: 'Password cracking tool - 8k+ stars, supports 300+ hash types',
    language: 'C',
    difficulty: 'Advanced',
    stars: '8k+',
    category: 'Password Cracking',
    icon: '🔨',
    isProduction: true
  },
  {
    name: 'Hydra',
    url: 'https://github.com/vanhauser-thc/thc-hydra',
    description: 'Network login cracker - 6k+ stars, supports 50+ protocols',
    language: 'C',
    difficulty: 'Advanced',
    stars: '6k+',
    category: 'Brute Force',
    icon: '🌊',
    isProduction: true
  },

  // Expert - Penetration Testing
  {
    name: 'Metasploit Framework',
    url: 'https://github.com/rapid7/metasploit-framework',
    description: 'Penetration testing framework - 32k+ stars, industry standard',
    language: 'Ruby',
    difficulty: 'Expert',
    stars: '32k+',
    category: 'Penetration Testing',
    icon: '🎯',
    isProduction: true
  },
  {
    name: 'OWASP ZAP',
    url: 'https://github.com/zaproxy/zaproxy',
    description: 'Web application security scanner - 12k+ stars, OWASP project',
    language: 'Java',
    difficulty: 'Expert',
    stars: '12k+',
    category: 'Web Scanner',
    icon: '⚡',
    isProduction: true
  },
  {
    name: 'Aircrack-ng',
    url: 'https://github.com/aircrack-ng/aircrack-ng',
    description: 'WiFi security auditing suite - 4k+ stars, wireless penetration testing',
    language: 'C',
    difficulty: 'Expert',
    stars: '4k+',
    category: 'Wireless Security',
    icon: '📡',
    isProduction: true
  }
];
