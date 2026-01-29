import { defineStore } from 'pinia'

export const useCounterStore = defineStore('counter', {
  state: () => ({
    count: 0,
  }),
  actions: {
    inc() {
      this.count += 1
    },
    dec() {
      this.count -= 1
    },
  },
})

