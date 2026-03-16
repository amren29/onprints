export type ProofVersion = {
  id: string
  versionNo: number
  status: 'GENERATED' | 'SENT' | 'AMEND_REQUESTED' | 'AMEND_DONE' | 'APPROVED'
  files: { name: string; url?: string }[]
  description?: string
  createdAt: string
  proofLink: string
  amendRequest?: string
  amendAttachments?: { name: string; dataUrl: string; type: string }[]
}

export type OrderAsset = {
  id: string
  type: 'file' | 'link'
  name: string
  url: string
  createdAt: string
}

export type Jobsheet = {
  id: string
  orderId: string
  versionId: string
  approvedByName: string
  approvedByEmail: string
  signatureHash: string
  signatureImage?: string
  approvedAt: string
  files: { name: string; url?: string }[]
}

export type HistoryEntry = {
  id: string
  action: string
  tone: 'info' | 'success' | 'warning' | 'neutral'
  createdAt: string
}

export type Comment = {
  id: string
  text: string
  user: string
  createdAt: string
  attachments?: { name: string; url: string; type: 'image' | 'file' }[]
}

export type KanbanItem = {
  id: string
  task: string
  priority: 'low' | 'medium' | 'high'
  owner: string
  due: string
  files: number
  comments: number
  links: number
  progress: string
  tags: string[]
  description: string
  attachments: { id: string; type: 'file' | 'link' | 'image'; name: string; url: string; createdAt: string }[]
  commentsData: { id: string; text: string; user: string; createdAt: string }[]
  proofStatus?: 'none' | 'pending' | 'artwork_proof_generated' | 'sent' | 'approved' | 'rejected' | 'changes_requested'
  assignees?: string[]
  subtasks?: { id: string; title: string; completed: boolean }[]
  startDate?: string
  trackedTime?: string
  proofVersions?: ProofVersion[]
  orderAssets?: OrderAsset[]
  historyEntries?: HistoryEntry[]
  jobsheets?: Jobsheet[]
}

export type KanbanColumn = {
  id: string
  name: string
  items: KanbanItem[]
  tone?: string
  systemKey?: string
  visibleToRoles?: string[]
}
