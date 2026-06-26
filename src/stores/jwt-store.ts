import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { JwtAlgorithm, JwtMode } from '@/pages/jwt/types'
import { DEFAULT_HEADER, DEFAULT_PAYLOAD } from '@/pages/jwt/constants'

interface JwtPageState {
  mode: JwtMode
  tokenInput: string
  genHeader: string
  genPayload: string
  genSecret: string
  genAlgorithm: JwtAlgorithm
  generatedToken: string
  setMode: (mode: JwtMode) => void
  setTokenInput: (tokenInput: string) => void
  setGenHeader: (genHeader: string) => void
  setGenPayload: (genPayload: string) => void
  setGenSecret: (genSecret: string) => void
  setGenAlgorithm: (genAlgorithm: JwtAlgorithm) => void
  setGeneratedToken: (generatedToken: string) => void
  clearDecode: () => void
  clearGenerate: () => void
}

type PersistedJwtPage = Pick<
  JwtPageState,
  'mode' | 'tokenInput' | 'genHeader' | 'genPayload' | 'genSecret' | 'genAlgorithm' | 'generatedToken'
>

export const useJwtStore = create<JwtPageState>()(
  persist<JwtPageState, [], [], PersistedJwtPage>(
    (set) => ({
      mode: 'decode',
      tokenInput: '',
      genHeader: DEFAULT_HEADER,
      genPayload: DEFAULT_PAYLOAD,
      genSecret: '',
      genAlgorithm: 'HS256',
      generatedToken: '',

      setMode: (mode) => set({ mode }),
      setTokenInput: (tokenInput) => set({ tokenInput }),
      setGenHeader: (genHeader) => set({ genHeader }),
      setGenPayload: (genPayload) => set({ genPayload }),
      setGenSecret: (genSecret) => set({ genSecret }),
      setGenAlgorithm: (genAlgorithm) => set({ genAlgorithm }),
      setGeneratedToken: (generatedToken) => set({ generatedToken }),

      clearDecode: () => set({ tokenInput: '' }),
      clearGenerate: () =>
        set({
          genHeader: DEFAULT_HEADER,
          genPayload: DEFAULT_PAYLOAD,
          genSecret: '',
          generatedToken: '',
        }),
    }),
    {
      name: 'hexbuffer-jwt-page',
      partialize: (state) => ({
        mode: state.mode,
        tokenInput: state.tokenInput,
        genHeader: state.genHeader,
        genPayload: state.genPayload,
        genSecret: state.genSecret,
        genAlgorithm: state.genAlgorithm,
        generatedToken: state.generatedToken,
      }),
      merge: (persisted, current): JwtPageState => {
        const base = current as JwtPageState
        const state = persisted as Partial<PersistedJwtPage> | undefined
        const validAlgorithms: JwtAlgorithm[] = ['HS256', 'HS384', 'HS512']
        const algorithm = state?.genAlgorithm ?? base.genAlgorithm
        return {
          ...base,
          mode: state?.mode ?? base.mode,
          tokenInput: state?.tokenInput ?? base.tokenInput,
          genHeader: state?.genHeader ?? base.genHeader,
          genPayload: state?.genPayload ?? base.genPayload,
          genSecret: state?.genSecret ?? base.genSecret,
          genAlgorithm: validAlgorithms.includes(algorithm as JwtAlgorithm)
            ? (algorithm as JwtAlgorithm)
            : 'HS256',
          generatedToken: state?.generatedToken ?? base.generatedToken,
        }
      },
    }
  )
)
