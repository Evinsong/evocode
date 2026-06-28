import { useState, useEffect, useCallback } from 'react'
import { Brain, Sparkles, Plus, Pencil, Trash2, Loader2 } from 'lucide-react'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { apiClient } from '@/services/apiClient'
import { useToast } from '@/components/ui/use-toast'
import { formatTime } from '@/lib/utils'
import type { Memory, MemoryType, Skill, SkillSource } from '@shared/types'

const MEMORY_TYPE_LABELS: Record<MemoryType, string> = {
  user_preference: '用户偏好',
  project_context: '项目上下文',
  historical_decision: '历史决策',
}

const MEMORY_TYPES: MemoryType[] = ['user_preference', 'project_context', 'historical_decision']

const SKILL_SOURCE_LABELS: Record<SkillSource, string> = {
  auto: '自动学习',
  manual: '手动创建',
}

function KnowledgeHubPage() {
  const [activeTab, setActiveTab] = useState<string>('memory')
  const [memories, setMemories] = useState<Memory[]>([])
  const [skills, setSkills] = useState<Skill[]>([])
  const [loading, setLoading] = useState<boolean>(true)
  const [memoryFilter, setMemoryFilter] = useState<MemoryType | 'all'>('all')
  const [editingMemory, setEditingMemory] = useState<Memory | null>(null)
  const [editingSkill, setEditingSkill] = useState<Skill | null>(null)
  const [isDialogOpen, setIsDialogOpen] = useState<boolean>(false)
  const { toast } = useToast()

  const loadData = useCallback(async () => {
    setLoading(true)
    try {
      const [memData, skillData] = await Promise.allSettled([
        apiClient.get<Memory[]>('/api/memories'),
        apiClient.get<Skill[]>('/api/skills'),
      ])
      if (memData.status === 'fulfilled') setMemories(memData.value)
      if (skillData.status === 'fulfilled') setSkills(skillData.value)
    } catch {
      // API endpoints may not be available yet; show empty state
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadData()
  }, [loadData])

  const filteredMemories =
    memoryFilter === 'all'
      ? memories
      : memories.filter((m) => m.type === memoryFilter)

  const handleDeleteMemory = async (id: string): Promise<void> => {
    try {
      await apiClient.del(`/api/memories/${id}`)
      setMemories((prev) => prev.filter((m) => m.id !== id))
      toast({ title: '已删除记忆' })
    } catch (err) {
      toast({
        title: '删除失败',
        description: err instanceof Error ? err.message : '未知错误',
        variant: 'destructive',
      })
    }
  }

  const handleDeleteSkill = async (id: string): Promise<void> => {
    try {
      await apiClient.del(`/api/skills/${id}`)
      setSkills((prev) => prev.filter((s) => s.id !== id))
      toast({ title: '已删除技能' })
    } catch (err) {
      toast({
        title: '删除失败',
        description: err instanceof Error ? err.message : '未知错误',
        variant: 'destructive',
      })
    }
  }

  const handleSaveMemory = async (memory: Partial<Memory>): Promise<void> => {
    try {
      if (editingMemory) {
        const updated = await apiClient.put<Memory>(
          `/api/memories/${editingMemory.id}`,
          memory,
        )
        setMemories((prev) => prev.map((m) => (m.id === editingMemory.id ? updated : m)))
      } else {
        const created = await apiClient.post<Memory>('/api/memories', memory)
        setMemories((prev) => [...prev, created])
      }
      setIsDialogOpen(false)
      setEditingMemory(null)
      toast({ title: '保存成功' })
    } catch (err) {
      toast({
        title: '保存失败',
        description: err instanceof Error ? err.message : '未知错误',
        variant: 'destructive',
      })
    }
  }

  const handleSaveSkill = async (skill: Partial<Skill>): Promise<void> => {
    try {
      if (editingSkill) {
        const updated = await apiClient.put<Skill>(
          `/api/skills/${editingSkill.id}`,
          skill,
        )
        setSkills((prev) => prev.map((s) => (s.id === editingSkill.id ? updated : s)))
      } else {
        const created = await apiClient.post<Skill>('/api/skills', skill)
        setSkills((prev) => [...prev, created])
      }
      setIsDialogOpen(false)
      setEditingSkill(null)
      toast({ title: '保存成功' })
    } catch (err) {
      toast({
        title: '保存失败',
        description: err instanceof Error ? err.message : '未知错误',
        variant: 'destructive',
      })
    }
  }

  return (
    <div className="h-full p-4">
      <Tabs value={activeTab} onValueChange={setActiveTab} className="h-full">
        <div className="mb-4 flex items-center justify-between">
          <TabsList>
            <TabsTrigger value="memory" className="gap-1.5">
              <Brain className="h-4 w-4" />
              记忆
            </TabsTrigger>
            <TabsTrigger value="skill" className="gap-1.5">
              <Sparkles className="h-4 w-4" />
              技能
            </TabsTrigger>
          </TabsList>

          <Button
            size="sm"
            onClick={() => {
              if (activeTab === 'memory') {
                setEditingMemory(null)
              } else {
                setEditingSkill(null)
              }
              setIsDialogOpen(true)
            }}
          >
            <Plus className="mr-1 h-4 w-4" />
            新增
          </Button>
        </div>

        {/* Memory Tab */}
        <TabsContent value="memory" className="mt-0">
          {/* Filter */}
          <div className="mb-3 flex items-center gap-2">
            <span className="text-sm text-muted-foreground">筛选:</span>
            <Select
              value={memoryFilter}
              onValueChange={(v) => setMemoryFilter(v as MemoryType | 'all')}
            >
              <SelectTrigger className="h-8 w-[160px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">全部类型</SelectItem>
                {MEMORY_TYPES.map((type) => (
                  <SelectItem key={type} value={type}>
                    {MEMORY_TYPE_LABELS[type]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <span className="text-xs text-muted-foreground">
              ({filteredMemories.length} 条)
            </span>
          </div>

          {/* Memory list */}
          {loading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : filteredMemories.length === 0 ? (
            <EmptyState icon={Brain} text="暂无记忆数据" />
          ) : (
            <ScrollArea className="h-[calc(100vh-16rem)]">
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {filteredMemories.map((memory) => (
                  <Card key={memory.id}>
                    <CardHeader className="pb-2">
                      <div className="flex items-center justify-between">
                        <Badge variant="secondary" className="text-xs">
                          {MEMORY_TYPE_LABELS[memory.type]}
                        </Badge>
                        <div className="flex gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7"
                            onClick={() => {
                              setEditingMemory(memory)
                              setIsDialogOpen(true)
                            }}
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-destructive"
                            onClick={() => handleDeleteMemory(memory.id)}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </div>
                      <CardTitle className="text-sm">{memory.key}</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="mb-2 line-clamp-3 text-xs text-muted-foreground">
                        {memory.value}
                      </p>
                      <p className="text-xs text-muted-foreground/60">
                        更新于 {formatTime(memory.updatedAt)}
                      </p>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </ScrollArea>
          )}
        </TabsContent>

        {/* Skill Tab */}
        <TabsContent value="skill" className="mt-0">
          {loading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : skills.length === 0 ? (
            <EmptyState icon={Sparkles} text="暂无技能数据" />
          ) : (
            <ScrollArea className="h-[calc(100vh-14rem)]">
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {skills.map((skill) => (
                  <Card key={skill.id}>
                    <CardHeader className="pb-2">
                      <div className="flex items-center justify-between">
                        <Badge
                          variant={skill.source === 'auto' ? 'default' : 'secondary'}
                          className="text-xs"
                        >
                          {SKILL_SOURCE_LABELS[skill.source]}
                        </Badge>
                        <div className="flex gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7"
                            onClick={() => {
                              setEditingSkill(skill)
                              setIsDialogOpen(true)
                            }}
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-destructive"
                            onClick={() => handleDeleteSkill(skill.id)}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </div>
                      <CardTitle className="text-sm">{skill.name}</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="mb-2 line-clamp-2 text-xs text-muted-foreground">
                        {skill.description}
                      </p>
                      <div className="flex items-center gap-3 text-xs text-muted-foreground/60">
                        <span>使用 {skill.usageCount} 次</span>
                        <span>·</span>
                        <span>{formatTime(skill.updatedAt).slice(0, 10)}</span>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </ScrollArea>
          )}
        </TabsContent>
      </Tabs>

      {/* Edit Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          {activeTab === 'memory' ? (
            <MemoryEditForm
              memory={editingMemory}
              onSave={handleSaveMemory}
              onCancel={() => setIsDialogOpen(false)}
            />
          ) : (
            <SkillEditForm
              skill={editingSkill}
              onSave={handleSaveSkill}
              onCancel={() => setIsDialogOpen(false)}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}

// ---- Sub Components ----

function EmptyState({ icon: Icon, text }: { icon: typeof Brain; text: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <Icon className="mb-3 h-12 w-12 text-muted-foreground/30" />
      <p className="text-sm text-muted-foreground">{text}</p>
    </div>
  )
}

function MemoryEditForm({
  memory,
  onSave,
  onCancel,
}: {
  memory: Memory | null
  onSave: (memory: Partial<Memory>) => Promise<void>
  onCancel: () => void
}) {
  const [type, setType] = useState<MemoryType>(memory?.type ?? 'user_preference')
  const [key, setKey] = useState(memory?.key ?? '')
  const [value, setValue] = useState(memory?.value ?? '')

  return (
    <>
      <DialogHeader>
        <DialogTitle>{memory ? '编辑记忆' : '新增记忆'}</DialogTitle>
      </DialogHeader>
      <div className="space-y-4 py-2">
        <div className="space-y-2">
          <label className="text-sm font-medium">类型</label>
          <Select value={type} onValueChange={(v) => setType(v as MemoryType)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {MEMORY_TYPES.map((t) => (
                <SelectItem key={t} value={t}>
                  {MEMORY_TYPE_LABELS[t]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <label className="text-sm font-medium">键名</label>
          <Input value={key} onChange={(e) => setKey(e.target.value)} placeholder="记忆键名" />
        </div>
        <div className="space-y-2">
          <label className="text-sm font-medium">内容</label>
          <Textarea
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder="记忆内容"
            className="min-h-[100px]"
          />
        </div>
      </div>
      <DialogFooter>
        <Button variant="outline" onClick={onCancel}>
          取消
        </Button>
        <Button onClick={() => onSave({ type, key, value })} disabled={!key || !value}>
          保存
        </Button>
      </DialogFooter>
    </>
  )
}

function SkillEditForm({
  skill,
  onSave,
  onCancel,
}: {
  skill: Skill | null
  onSave: (skill: Partial<Skill>) => Promise<void>
  onCancel: () => void
}) {
  const [name, setName] = useState(skill?.name ?? '')
  const [description, setDescription] = useState(skill?.description ?? '')
  const [pattern, setPattern] = useState(skill?.pattern ?? '')
  const [definition, setDefinition] = useState(skill?.definition ?? '')

  return (
    <>
      <DialogHeader>
        <DialogTitle>{skill ? '编辑技能' : '新增技能'}</DialogTitle>
      </DialogHeader>
      <div className="space-y-4 py-2">
        <div className="space-y-2">
          <label className="text-sm font-medium">名称</label>
          <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="技能名称" />
        </div>
        <div className="space-y-2">
          <label className="text-sm font-medium">描述</label>
          <Input
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="技能描述"
          />
        </div>
        <div className="space-y-2">
          <label className="text-sm font-medium">匹配模式</label>
          <Input
            value={pattern}
            onChange={(e) => setPattern(e.target.value)}
            placeholder="正则表达式或关键词"
          />
        </div>
        <div className="space-y-2">
          <label className="text-sm font-medium">定义</label>
          <Textarea
            value={definition}
            onChange={(e) => setDefinition(e.target.value)}
            placeholder="技能定义 (JSON)"
            className="min-h-[100px] font-mono text-xs"
          />
        </div>
      </div>
      <DialogFooter>
        <Button variant="outline" onClick={onCancel}>
          取消
        </Button>
        <Button onClick={() => onSave({ name, description, pattern, definition })} disabled={!name}>
          保存
        </Button>
      </DialogFooter>
    </>
  )
}

export default KnowledgeHubPage
