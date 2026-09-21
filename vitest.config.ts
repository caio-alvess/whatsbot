import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    globals: true,
    projects: [
      {
        test: {
          name: 'WhatsappManager',
          include: ['src/main/whatsapp/manager.int.spec.ts'],
          fileParallelism: false,
          sequence: {
            concurrent: false
          }
        }
      }
    ]
  }
})
