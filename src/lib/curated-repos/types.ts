export interface CuratedRepo {
  name: string;
  url: string;
  description: string;
  language: string;
  difficulty: 'Beginner' | 'Intermediate' | 'Advanced';
  stars: string;
  category: string;
  icon: string;
  isProduction: boolean;
  childRepos?: CuratedRepo[]; // For frameworks with related projects
}

