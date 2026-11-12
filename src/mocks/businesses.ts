export type Business = {
  id: number
  name: string
  initials: string
  category: string
  location: string
  description: string
  offers: string[]
  needs: string[]
  value: string
  rating: string
  exchanges: number
  color: string
  accent: string
  image: string
}

export const businesses: Business[] = [
  {
    id: 1,
    name: 'Peachtree Growth Co.',
    initials: 'PG',
    category: 'Marketing',
    location: 'Atlanta, GA',
    description:
      'Growth strategy and campaigns that help ambitious small businesses find their next customer.',
    offers: ['Marketing strategy', 'Social campaigns', 'SEO'],
    needs: ['Website redesign', 'Video production'],
    value: '$750–$2,000',
    rating: '4.9',
    exchanges: 18,
    color: '#e8f4ff',
    accent: '#087fe5',
    image: 'https://images.unsplash.com/photo-1556761175-b413da4baf72?auto=format&fit=crop&w=900&q=85',
  },
  {
    id: 2,
    name: 'Frame & Field Studio',
    initials: 'FF',
    category: 'Photography',
    location: 'Atlanta, GA',
    description:
      'Warm, modern product and brand photography for founders building memorable companies.',
    offers: ['Product photography', 'Brand photography'],
    needs: ['Brand identity', 'Website maintenance'],
    value: '$300–$900',
    rating: '4.8',
    exchanges: 12,
    color: '#fff2e8',
    accent: '#c75d16',
    image: 'https://images.unsplash.com/photo-1522202176988-66273c2fd55f?auto=format&fit=crop&w=900&q=85',
  },
  {
    id: 3,
    name: 'Good Ground Creative',
    initials: 'GG',
    category: 'Design',
    location: 'Remote',
    description:
      'A thoughtful brand studio helping early-stage teams look established from day one.',
    offers: ['Logo design', 'Brand identity', 'Social templates'],
    needs: ['Photography', 'Bookkeeping'],
    value: '$400–$1,500',
    rating: '5.0',
    exchanges: 9,
    color: '#f1ebff',
    accent: '#7047c7',
    image: 'https://images.unsplash.com/photo-1558655146-9f40138edfeb?auto=format&fit=crop&w=900&q=85',
  },
  {
    id: 4,
    name: 'ClearPath Bookkeeping',
    initials: 'CP',
    category: 'Business Services',
    location: 'Remote',
    description:
      'Clear, founder-friendly bookkeeping that gives growing businesses confidence in their numbers.',
    offers: ['Monthly bookkeeping', 'Financial organization'],
    needs: ['Website updates', 'Marketing support'],
    value: '$250–$800',
    rating: '4.9',
    exchanges: 21,
    color: '#e7f8f1',
    accent: '#16835d',
    image: 'https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?auto=format&fit=crop&w=900&q=85',
  },
  {
    id: 5,
    name: 'Oakline Home Services',
    initials: 'OH',
    category: 'Home Services',
    location: 'Atlanta, GA',
    description:
      'Reliable painting and repair services for offices, studios, and local storefronts.',
    offers: ['Interior painting', 'Small repairs'],
    needs: ['Website refresh', 'Local marketing'],
    value: '$500–$2,000',
    rating: '4.7',
    exchanges: 7,
    color: '#fff7dd',
    accent: '#a46c00',
    image: 'https://images.unsplash.com/photo-1581578731548-c64695cc6952?auto=format&fit=crop&w=900&q=85',
  },
]
