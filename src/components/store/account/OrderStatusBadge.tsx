import { OrderStatus, ProductionStatus } from '@/types/store'

const STATUS_STYLES: Record<OrderStatus, string> = {
  Pending:   'bg-amber-100 text-amber-700',
  Confirmed: 'bg-blue-100 text-blue-700',
  Cancelled: 'bg-red-100 text-red-600',
}

const PROD_STYLES: Record<ProductionStatus, string> = {
  'Queued':        'bg-gray-100 text-gray-600',
  'In Progress':   'bg-blue-100 text-blue-700',
  'Quality Check': 'bg-amber-100 text-amber-700',
  'Completed':     'bg-green-100 text-green-700',
  'Shipped':       'bg-purple-100 text-purple-700',
  'Delivered':     'bg-green-100 text-green-700',
  '—':             'bg-gray-50 text-gray-400',
}

export function OrderStatusBadge({ status }: { status: OrderStatus }) {
  return (
    <span className={`inline-block text-[11px] font-bold px-2.5 py-1 rounded-full ${STATUS_STYLES[status]}`}>
      {status}
    </span>
  )
}

export function ProductionBadge({ status }: { status: ProductionStatus }) {
  return (
    <span className={`inline-block text-[11px] font-bold px-2.5 py-1 rounded-full ${PROD_STYLES[status]}`}>
      {status}
    </span>
  )
}

export default OrderStatusBadge
