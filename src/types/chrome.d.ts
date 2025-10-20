// Additional Chrome extension types
export interface ChromeMessage {
  type: string
  data?: any
  target?: string
}

export interface GPTRequestData {
  message: string
  context?: {
    title?: string
    url?: string
  }
}

export interface LighthouseRequestData {
  url: string
  tabId: number
}
