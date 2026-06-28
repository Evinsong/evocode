import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Rocket,
  Settings as SettingsIcon,
  LayoutDashboard,
  Code2,
  ChevronLeft,
  ChevronRight,
  type LucideIcon,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { ROUTES } from '@/lib/constants'

interface OnboardingStep {
  icon: LucideIcon
  title: string
  description: string
  highlights: string[]
}

const STEPS: OnboardingStep[] = [
  {
    icon: Rocket,
    title: '欢迎使用 EvoCode',
    description: 'EvoCode（易码）是一款融合自进化记忆、多 Agent 可视化协作与高审美代码生成的编码智能体。',
    highlights: [
      '5 个专业 Agent 协同工作',
      '实时可视化协作看板',
      '自进化记忆与技能系统',
    ],
  },
  {
    icon: SettingsIcon,
    title: '配置模型',
    description: '在开始之前，请配置你的 AI 模型提供商。EvoCode 支持 OpenAI、Anthropic 和本地 Ollama。',
    highlights: [
      '支持多模型提供商切换',
      '可配置 API Key、温度、Token 限制',
      '本地模型完全离线可用',
    ],
  },
  {
    icon: LayoutDashboard,
    title: '了解协作看板',
    description: '看板实时展示 5 个 Agent 的工作状态，包括需求分析、架构设计、编码、测试和审查。',
    highlights: [
      '实时状态追踪（思考中/执行中/待审核）',
      '支持人工干预（暂停/恢复/修改/终止）',
      'WebSocket 实时推送更新',
    ],
  },
  {
    icon: Code2,
    title: '开始你的第一个项目',
    description: '在对话面板中描述你的需求，Agent 团队将自动协作完成代码生成。生成的代码可直接预览和导出。',
    highlights: [
      '自然语言驱动代码生成',
      '实时代码预览与编辑',
      '支持 React、Vue、HTML 多框架',
    ],
  },
]

function OnboardingPage() {
  const navigate = useNavigate()
  const [currentStep, setCurrentStep] = useState<number>(0)

  const handleNext = (): void => {
    if (currentStep < STEPS.length - 1) {
      setCurrentStep(currentStep + 1)
    } else {
      navigate(ROUTES.HOME)
    }
  }

  const handlePrev = (): void => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1)
    }
  }

  const handleSkip = (): void => {
    navigate(ROUTES.HOME)
  }

  const step = STEPS[currentStep]
  const Icon = step.icon
  const isLastStep = currentStep === STEPS.length - 1

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <div className="w-full max-w-2xl">
        <Card>
          <CardContent className="p-8">
            {/* Progress dots */}
            <div className="mb-8 flex items-center justify-center gap-2">
              {STEPS.map((_, index) => (
                <button
                  key={index}
                  onClick={() => setCurrentStep(index)}
                  className={`h-2 rounded-full transition-all ${
                    index === currentStep
                      ? 'w-8 bg-primary'
                      : 'w-2 bg-muted-foreground/30 hover:bg-muted-foreground/50'
                  }`}
                  aria-label={`步骤 ${index + 1}`}
                />
              ))}
            </div>

            {/* Step content */}
            <div className="flex flex-col items-center text-center">
              {/* Icon */}
              <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-2xl bg-primary/10">
                <Icon className="h-10 w-10 text-primary" />
              </div>

              {/* Title */}
              <h2 className="mb-3 text-2xl font-bold">{step.title}</h2>

              {/* Description */}
              <p className="mb-6 max-w-md text-sm text-muted-foreground">
                {step.description}
              </p>

              {/* Highlights */}
              <div className="mb-8 w-full max-w-md space-y-2">
                {step.highlights.map((highlight, index) => (
                  <div
                    key={index}
                    className="flex items-center gap-2 rounded-lg bg-muted/50 px-3 py-2 text-left text-sm"
                  >
                    <div className="h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
                    <span>{highlight}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Navigation buttons */}
            <div className="flex items-center justify-between">
              <Button variant="ghost" size="sm" onClick={handleSkip}>
                跳过引导
              </Button>

              <div className="flex items-center gap-2">
                {currentStep > 0 && (
                  <Button variant="outline" size="sm" onClick={handlePrev} className="gap-1.5">
                    <ChevronLeft className="h-4 w-4" />
                    上一步
                  </Button>
                )}
                <Button size="sm" onClick={handleNext} className="gap-1.5">
                  {isLastStep ? '进入工作台' : '下一步'}
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Step counter */}
        <p className="mt-4 text-center text-xs text-muted-foreground">
          步骤 {currentStep + 1} / {STEPS.length}
        </p>
      </div>
    </div>
  )
}

export default OnboardingPage
