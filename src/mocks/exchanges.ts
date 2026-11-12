import { businesses } from './businesses'

export type ExchangeStatus = 'Awaiting response' | 'Changes requested' | 'In progress' | 'Awaiting confirmation' | 'Completed'

export const demoExchangeStatuses: Record<number, ExchangeStatus> = {
  1: 'In progress',
  2: 'Awaiting confirmation',
  3: 'Awaiting response',
  4: 'Changes requested',
  5: 'Completed',
}

export const demoExchanges = [
  { id: 1, business: businesses[0], type: 'Active', title: 'Website redesign ↔ Growth campaign', give: 'Website redesign', receive: '90-day growth campaign', value: '$1,800 each', due: 'Nov 18' },
  { id: 2, business: businesses[1], type: 'Active', title: 'Landing page ↔ Product photography', give: 'Conversion landing page', receive: '24 edited product photos', value: '$900 each', due: 'Nov 8' },
  { id: 3, business: businesses[3], type: 'Incoming', title: 'Website updates ↔ Bookkeeping setup', give: 'Website maintenance', receive: '3-month bookkeeping setup', value: '$750 each', due: 'Proposed Dec 12' },
  { id: 4, business: businesses[2], type: 'Sent', title: 'Frontend support ↔ Brand identity', give: 'Frontend implementation', receive: 'Brand identity package', value: '$1,400 each', due: 'Proposed Dec 4' },
  { id: 5, business: businesses[4], type: 'Completed', title: 'Website refresh ↔ Studio painting', give: 'Five-page website refresh', receive: 'Studio interior painting', value: '$1,600 each', due: 'Completed Oct 14' },
]
