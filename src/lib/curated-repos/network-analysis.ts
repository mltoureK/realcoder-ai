import { type CuratedRepo } from './types';

export const NETWORK_ANALYSIS_PATH: CuratedRepo[] = [
  // Beginner - Network Fundamentals
  {
    name: 'Network Basics Tutorial',
    url: 'https://www.cisco.com/c/en/us/support/docs/ip/routing-information-protocol-rip/13788-3.html',
    description: 'Learn TCP/IP fundamentals, OSI model, and basic networking concepts',
    language: 'Networking',
    difficulty: 'Beginner',
    stars: 'Cisco',
    category: 'Fundamentals',
    icon: '📚',
    isProduction: true
  },
  {
    name: 'tcpdump',
    url: 'https://www.tcpdump.org/',
    description: 'Command-line packet analyzer - learn to capture and analyze network traffic',
    language: 'C',
    difficulty: 'Beginner',
    stars: 'Classic',
    category: 'Packet Capture',
    icon: '📦',
    isProduction: true
  },
  {
    name: 'netstat',
    url: 'https://en.wikipedia.org/wiki/Netstat',
    description: 'Network statistics tool - learn to monitor network connections and routing',
    language: 'System',
    difficulty: 'Beginner',
    stars: 'Built-in',
    category: 'Network Stats',
    icon: '📊',
    isProduction: true
  },

  // Intermediate - Protocol Analysis
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
    description: 'Network discovery and security auditing - 8k+ stars, professional tool',
    language: 'C++',
    difficulty: 'Intermediate',
    stars: '8k+',
    category: 'Network Discovery',
    icon: '🗺️',
    isProduction: true
  },
  {
    name: 'tshark',
    url: 'https://www.wireshark.org/docs/man-pages/tshark.html',
    description: 'Command-line version of Wireshark - learn network analysis automation',
    language: 'C++',
    difficulty: 'Intermediate',
    stars: 'Wireshark',
    category: 'CLI Analysis',
    icon: '⚡',
    isProduction: true
  },

  // Advanced - Network Monitoring
  {
    name: 'Zabbix',
    url: 'https://github.com/zabbix/zabbix',
    description: 'Enterprise monitoring solution - 8k+ stars, network performance monitoring',
    language: 'PHP/C++',
    difficulty: 'Advanced',
    stars: '8k+',
    category: 'Monitoring',
    icon: '📈',
    isProduction: true
  },
  {
    name: 'Nagios',
    url: 'https://github.com/NagiosEnterprises/nagioscore',
    description: 'Infrastructure monitoring - 2k+ stars, network service monitoring',
    language: 'C',
    difficulty: 'Advanced',
    stars: '2k+',
    category: 'Infrastructure Monitoring',
    icon: '👁️',
    isProduction: true
  },
  {
    name: 'Cacti',
    url: 'https://github.com/Cacti/cacti',
    description: 'Network graphing solution - 1k+ stars, RRDtool-based monitoring',
    language: 'PHP',
    difficulty: 'Advanced',
    stars: '1k+',
    category: 'Network Graphing',
    icon: '📊',
    isProduction: true
  },

  // Expert - Advanced Analysis
  {
    name: 'Bro/Zeek',
    url: 'https://github.com/zeek/zeek',
    description: 'Network security monitor - 6k+ stars, deep packet inspection',
    language: 'C++',
    difficulty: 'Expert',
    stars: '6k+',
    category: 'Security Monitor',
    icon: '🕵️',
    isProduction: true
  },
  {
    name: 'Suricata',
    url: 'https://github.com/OISF/suricata',
    description: 'Network IDS/IPS - 3k+ stars, real-time network intrusion detection',
    language: 'C',
    difficulty: 'Expert',
    stars: '3k+',
    category: 'Intrusion Detection',
    icon: '🚨',
    isProduction: true
  }
];
