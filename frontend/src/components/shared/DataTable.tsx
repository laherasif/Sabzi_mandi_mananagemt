import { cn } from '@/lib/utils'

interface DataTableColumn<T> {
  key: string
  header: string
  /** Extra classes for both th and td */
  className?: string
  /** start (default) | end (amounts) | center */
  align?: 'start' | 'end' | 'center'
  /** Optional fixed width e.g. "8rem" or "22%" */
  width?: string
  cell: (row: T) => React.ReactNode
}

interface DataTableProps<T> {
  columns: DataTableColumn<T>[]
  data: T[]
  rowKey: (row: T) => string
  empty?: React.ReactNode
  className?: string
}

const alignClass = {
  start: 'text-start',
  end: 'text-end',
  center: 'text-center',
} as const

export function DataTable<T>({ columns, data, rowKey, empty, className }: DataTableProps<T>) {
  if (data.length === 0 && empty) return <>{empty}</>

  return (
    <div className={cn('overflow-x-auto rounded-2xl border border-border bg-white market-shadow', className)}>
      <table className="w-full min-w-[640px] border-collapse text-sm">
        <thead>
          <tr className="bg-brand-light/70 text-brand-dark">
            {columns.map((col) => (
              <th
                key={col.key}
                scope="col"
                style={col.width ? { width: col.width } : undefined}
                className={cn(
                  'border-b border-brand/15 px-4 py-3.5 text-sm font-bold whitespace-nowrap',
                  alignClass[col.align ?? 'start'],
                  col.className
                )}
              >
                {col.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.map((row) => (
            <tr key={rowKey(row)} className="border-t border-border hover:bg-stone-50/80">
              {columns.map((col) => (
                <td
                  key={col.key}
                  style={col.width ? { width: col.width } : undefined}
                  className={cn(
                    'px-4 py-3.5 align-middle',
                    alignClass[col.align ?? 'start'],
                    col.className
                  )}
                >
                  {col.cell(row)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
