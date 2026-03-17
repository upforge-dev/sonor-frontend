import { useState } from 'react'
import { Users, Tag } from 'lucide-react'
import { cn } from '@/lib/utils'
import ListManagement from '@/components/email/ListManagement'
import EmailPlatform from '@/components/email/EmailPlatform'

const SUB_TABS = [
  { value: 'subscribers', label: 'Subscribers', icon: Users },
  { value: 'lists', label: 'Lists', icon: Tag },
]

export default function AudienceTab() {
  const [subTab, setSubTab] = useState('subscribers')

  return (
    <div className="h-full">
      <div className="flex items-center gap-1 px-6 pt-4 pb-0">
        {SUB_TABS.map((tab) => (
          <button
            key={tab.value}
            onClick={() => setSubTab(tab.value)}
            className={cn(
              'flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm transition-colors',
              subTab === tab.value
                ? 'bg-primary/10 text-primary font-medium'
                : 'text-muted-foreground hover:text-foreground hover:bg-muted'
            )}
          >
            <tab.icon className="h-3.5 w-3.5" />
            {tab.label}
          </button>
        ))}
      </div>

      {subTab === 'subscribers' && (
        <EmailPlatform
          embedded
          activeTab="subscribers"
          onTabChange={() => {}}
        />
      )}

      {subTab === 'lists' && (
        <div className="p-6">
          <ListManagement />
        </div>
      )}
    </div>
  )
}
