import {
  createFlagsDiscoveryEndpoint,
  getProviderData
} from 'flags/next'
import {
  aiBackendModeFlag,
  aiFailOpenFlag,
  aiSdkEnabledFlag,
  aiSdkProviderFlag,
  aiSearchDriverFlag
} from '@/flags/ai-flags'

const flags = {
  aiBackendModeFlag,
  aiSearchDriverFlag,
  aiFailOpenFlag,
  aiSdkEnabledFlag,
  aiSdkProviderFlag
}

export const GET = createFlagsDiscoveryEndpoint(() => getProviderData(flags), {
  secret: process.env.FLAGS_SECRET
})
