import { type CuratedRepo } from './types';

export const DEVOPS_NETWORKING_PATH: CuratedRepo[] = [
  // Beginner - Web Servers & Load Balancing
  {
    name: 'Nginx',
    url: 'https://github.com/nginx/nginx',
    description: 'High-performance web server and reverse proxy - 20k+ stars, powers 40% of websites',
    language: 'C',
    difficulty: 'Beginner',
    stars: '20k+',
    category: 'Web Server',
    icon: '⚡',
    isProduction: true
  },
  {
    name: 'Apache HTTP Server',
    url: 'https://github.com/apache/httpd',
    description: 'Most popular web server - 3k+ stars, learn traditional web serving',
    language: 'C',
    difficulty: 'Beginner',
    stars: '3k+',
    category: 'Web Server',
    icon: '🌐',
    isProduction: true
  },
  {
    name: 'HAProxy',
    url: 'https://github.com/haproxy/haproxy',
    description: 'High availability load balancer - 3k+ stars, used by major tech companies',
    language: 'C',
    difficulty: 'Beginner',
    stars: '3k+',
    category: 'Load Balancer',
    icon: '🔄',
    isProduction: true
  },

  // Intermediate - Container Networking
  {
    name: 'Docker',
    url: 'https://github.com/docker/docker',
    description: 'Container platform with networking - 70k+ stars, revolutionized DevOps',
    language: 'Go',
    difficulty: 'Intermediate',
    stars: '70k+',
    category: 'Container Platform',
    icon: '🐳',
    isProduction: true
  },
  {
    name: 'Docker Compose',
    url: 'https://github.com/docker/compose',
    description: 'Multi-container Docker applications - 30k+ stars, learn service networking',
    language: 'Go',
    difficulty: 'Intermediate',
    stars: '30k+',
    category: 'Container Orchestration',
    icon: '🎼',
    isProduction: true
  },
  {
    name: 'Traefik',
    url: 'https://github.com/traefik/traefik',
    description: 'Modern reverse proxy and load balancer - 50k+ stars, cloud-native networking',
    language: 'Go',
    difficulty: 'Intermediate',
    stars: '50k+',
    category: 'Cloud Native',
    icon: '🐳',
    isProduction: true
  },

  // Advanced - Orchestration & Service Mesh
  {
    name: 'Kubernetes',
    url: 'https://github.com/kubernetes/kubernetes',
    description: 'Container orchestration with advanced networking - 110k+ stars, industry standard',
    language: 'Go',
    difficulty: 'Advanced',
    stars: '110k+',
    category: 'Orchestration',
    icon: '☸️',
    isProduction: true
  },
  {
    name: 'Istio',
    url: 'https://github.com/istio/istio',
    description: 'Service mesh for microservices - 35k+ stars, advanced traffic management',
    language: 'Go',
    difficulty: 'Advanced',
    stars: '35k+',
    category: 'Service Mesh',
    icon: '🕸️',
    isProduction: true
  },
  {
    name: 'Linkerd',
    url: 'https://github.com/linkerd/linkerd2',
    description: 'Ultra-lightweight service mesh - 10k+ stars, simpler than Istio',
    language: 'Rust',
    difficulty: 'Advanced',
    stars: '10k+',
    category: 'Service Mesh',
    icon: '🔗',
    isProduction: true
  },

  // Expert - Advanced Infrastructure
  {
    name: 'Envoy Proxy',
    url: 'https://github.com/envoyproxy/envoy',
    description: 'Cloud-native edge and service proxy - 23k+ stars, used by Istio',
    language: 'C++',
    difficulty: 'Expert',
    stars: '23k+',
    category: 'Edge Proxy',
    icon: '🚀',
    isProduction: true
  },
  {
    name: 'Consul',
    url: 'https://github.com/hashicorp/consul',
    description: 'Service networking platform - 29k+ stars, service discovery and mesh',
    language: 'Go',
    difficulty: 'Expert',
    stars: '29k+',
    category: 'Service Discovery',
    icon: '🏛️',
    isProduction: true
  },
  {
    name: 'Vault',
    url: 'https://github.com/hashicorp/vault',
    description: 'Secrets management and data protection - 32k+ stars, secure networking',
    language: 'Go',
    difficulty: 'Expert',
    stars: '32k+',
    category: 'Secrets Management',
    icon: '🔐',
    isProduction: true
  }
];
