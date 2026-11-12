export type Listing = { id: number; type: 'Offer' | 'Need'; title: string; description: string; value: string }

export const demoListings: Listing[] = [
  { id: 1, type: 'Offer', title: 'Website design', description: 'Strategy, UX, visual design, and responsive implementation.', value: '$1,000–$2,500' },
  { id: 2, type: 'Offer', title: 'Landing pages', description: 'Focused conversion pages for campaigns and product launches.', value: '$600–$1,200' },
  { id: 3, type: 'Offer', title: 'Frontend development', description: 'Production-ready React interfaces and design systems.', value: '$1,000–$2,500' },
  { id: 4, type: 'Need', title: 'Marketing support', description: 'Growth strategy and campaign execution for a new service launch.', value: '$750–$1,500' },
  { id: 5, type: 'Need', title: 'Product photography', description: 'Clean, editorial product photos for our portfolio and social channels.', value: '$400–$900' },
  { id: 6, type: 'Need', title: 'Bookkeeping', description: 'Monthly categorization, reporting, and financial organization.', value: '$250–$600' },
]
