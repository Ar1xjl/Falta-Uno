import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAppData } from '../data/store'
import { getContact, getExpenseGroupKey, listExpenseGroups, type ExpenseGroup } from '../data/selectors'
import { addSettlement, deleteExpense } from '../data/actions'
import { computeBalances, computeTotalBalances, simplifyDebts, type SettleSuggestion } from '../lib/balances'
import type { AppData } from '../types'
import PageHeader from '../components/PageHeader'

export default function Expenses() {
  const data = useAppData()
  const navigate = useNavigate()
  const groups = listExpenseGroups(data)
  const [tab, setTab] = useState<'gastos' | 'balances'>('gastos')
  const [groupKey, setGroupKey] = useState<string | undefined>(() => (groups.length === 1 ? groups[0].key : undefined))
  const [pickerOpen, setPickerOpen] = useState(false)

  if (groups.length === 0) {
    return (
      <div className="flex flex-col">
        <PageHeader
          title="Gastos"
          trailing={
            <button onClick={() => navigate('/expenses/new')} className="btn btn-primary">
              + Nuevo gasto
            </button>
          }
        />
        <div className="p-4">
          <p className="empty-state">
            Todavía no cargaste gastos. Agregalos desde un evento o una serie para empezar a llevar la cuenta.
          </p>
        </div>
      </div>
    )
  }

  const activeGroup = groupKey ? groups.find((g) => g.key === groupKey) : undefined
  const balances = groupKey ? computeBalances(data, groupKey) : computeTotalBalances(data, groups.map((g) => g.key))
  const suggestions = groupKey ? simplifyDebts(balances) : []

  return (
    <div className="flex flex-col">
      <PageHeader
        title="Gastos"
        trailing={
          <button onClick={() => navigate('/expenses/new')} className="btn btn-primary">
            + Nuevo gasto
          </button>
        }
      />

      <div className="flex flex-col gap-3 p-4">
        <div className="pill-group">
          <button onClick={() => setTab('gastos')} className={`pill-btn ${tab === 'gastos' ? 'active' : ''}`}>
            Gastos
          </button>
          <button onClick={() => setTab('balances')} className={`pill-btn ${tab === 'balances' ? 'active' : ''}`}>
            Balances
          </button>
        </div>

        {groups.length > 1 && (
          <GroupPicker
            groups={groups}
            activeGroup={activeGroup}
            open={pickerOpen}
            onToggle={() => setPickerOpen((o) => !o)}
            onSelect={(key) => {
              setGroupKey(key)
              setPickerOpen(false)
            }}
          />
        )}

        {tab === 'gastos' ? (
          <ExpenseList data={data} groupKey={groupKey} />
        ) : (
          <BalancesView data={data} groupKey={groupKey} balances={balances} suggestions={suggestions} />
        )}
      </div>
    </div>
  )
}

function GroupPicker({
  groups,
  activeGroup,
  open,
  onToggle,
  onSelect,
}: {
  groups: ExpenseGroup[]
  activeGroup?: ExpenseGroup
  open: boolean
  onToggle: () => void
  onSelect: (key: string | undefined) => void
}) {
  return (
    <div>
      <button type="button" onClick={onToggle} className="section-label flex w-full items-center justify-between">
        <span>{activeGroup ? `${activeGroup.label}${activeGroup.sublabel ? ` · ${activeGroup.sublabel}` : ''}` : 'Todas las series y eventos (total)'}</span>
        <span>{open ? '▾' : '▸'}</span>
      </button>
      {open && (
        <div className="mt-2 flex flex-col gap-1">
          <button
            type="button"
            onClick={() => onSelect(undefined)}
            className={`list-row justify-between ${!activeGroup ? 'text-brand font-semibold' : ''}`}
          >
            <span>Ver todo (total)</span>
          </button>
          {groups.map((g) => (
            <button
              key={g.key}
              type="button"
              onClick={() => onSelect(g.key)}
              className={`list-row justify-between ${activeGroup?.key === g.key ? 'text-brand font-semibold' : ''}`}
            >
              <span>{g.label}</span>
              <span className="hint">{g.sublabel}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

function ExpenseList({ data, groupKey }: { data: AppData; groupKey?: string }) {
  const expenses = data.expenses
    .filter((e) => !groupKey || getExpenseGroupKey(data, e) === groupKey)
    .sort((a, b) => b.date.localeCompare(a.date))

  if (expenses.length === 0) {
    return <p className="empty-state">Todavía no hay gastos {groupKey ? 'en esta serie' : 'cargados'}.</p>
  }

  const total = expenses.reduce((sum, e) => sum + e.amount, 0)

  return (
    <div className="flex flex-col gap-2">
      <p className="hint">Total: ${total.toLocaleString('es-AR')}</p>
      {expenses.map((e) => {
        const payer = getContact(data, e.paidByContactId)
        const coverage = e.coveredEventIds
          ? `Abono · alcanza ${e.coveredEventIds.length} evento${e.coveredEventIds.length === 1 ? '' : 's'}`
          : `Dividido entre ${e.splitContactIds?.length ?? 0} persona${(e.splitContactIds?.length ?? 0) === 1 ? '' : 's'}`
        return (
          <div key={e.id} className="card flex flex-col gap-1">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-ink">{e.description}</span>
              <span className="font-semibold text-ink">${e.amount.toLocaleString('es-AR')}</span>
            </div>
            <span className="text-muted text-sm">
              Pagó {payer?.name ?? '—'} · {e.date}
            </span>
            <span className="hint">{coverage}</span>
            <button
              onClick={() => {
                if (confirm('¿Eliminar este gasto?')) deleteExpense(e.id)
              }}
              className="text-danger self-start text-xs font-semibold"
            >
              Borrar
            </button>
          </div>
        )
      })}
    </div>
  )
}

function BalancesView({
  data,
  groupKey,
  balances,
  suggestions,
}: {
  data: AppData
  groupKey?: string
  balances: Map<string, number>
  suggestions: SettleSuggestion[]
}) {
  const entries = Array.from(balances.entries())
    .filter(([, amount]) => Math.abs(amount) > 0.01)
    .sort((a, b) => b[1] - a[1])

  return (
    <div className="flex flex-col gap-4">
      <div className="card">
        <p className="card-title mb-0">{groupKey ? 'Balance por persona' : 'Balance total por persona'}</p>
        <div className="mt-2 flex flex-col gap-1">
          {entries.length === 0 ? (
            <p className="hint">Todo saldado.</p>
          ) : (
            entries.map(([contactId, amount]) => {
              const contact = getContact(data, contactId)
              return (
                <div key={contactId} className="list-row justify-between">
                  <span className="text-sm text-ink">{contact?.name ?? '—'}</span>
                  <span className={`text-sm font-semibold ${amount > 0 ? 'text-brand' : 'text-danger'}`}>
                    {amount > 0 ? `Le deben $${amount.toFixed(0)}` : `Debe $${Math.abs(amount).toFixed(0)}`}
                  </span>
                </div>
              )
            })
          )}
        </div>
        {!groupKey && entries.length > 0 && (
          <p className="hint mt-2">
            Es la suma de todas las series y eventos. Para ver a quién pagarle en concreto, elegí una serie o evento arriba.
          </p>
        )}
      </div>

      {groupKey && suggestions.length > 0 && (
        <div className="card">
          <p className="card-title mb-0">Para saldar</p>
          <div className="mt-2 flex flex-col gap-2">
            {suggestions.map((s, i) => (
              <SettleSuggestionRow key={i} suggestion={s} data={data} groupKey={groupKey} />
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

function SettleSuggestionRow({
  suggestion,
  data,
  groupKey,
}: {
  suggestion: SettleSuggestion
  data: AppData
  groupKey: string
}) {
  const from = getContact(data, suggestion.fromContactId)
  const to = getContact(data, suggestion.toContactId)
  const [copied, setCopied] = useState(false)

  function handleCopyAlias() {
    if (!to?.paymentAlias) return
    navigator.clipboard.writeText(to.paymentAlias).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    })
  }

  function handleMarkPaid() {
    if (!confirm(`¿Marcar como pagado el $${suggestion.amount.toFixed(0)} de ${from?.name} a ${to?.name}?`)) return
    addSettlement({
      groupKey,
      fromContactId: suggestion.fromContactId,
      toContactId: suggestion.toContactId,
      amount: suggestion.amount,
      date: new Date().toISOString().slice(0, 10),
    })
  }

  return (
    <div className="rounded-[7px] p-3" style={{ background: 'var(--color-bg)' }}>
      <p className="text-sm text-ink">
        <strong>{from?.name}</strong> le debe a <strong>{to?.name}</strong>{' '}
        <span className="text-brand font-semibold">${suggestion.amount.toFixed(0)}</span>
      </p>
      <div className="mt-2 flex flex-wrap gap-2">
        {to?.paymentAlias && (
          <button onClick={handleCopyAlias} className="btn-copy">
            {copied ? '¡Copiado!' : 'Copiar alias'}
          </button>
        )}
        <button onClick={handleMarkPaid} className="btn btn-ghost">
          Marcar como pagado
        </button>
      </div>
    </div>
  )
}
