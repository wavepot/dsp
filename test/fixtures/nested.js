export default mix => mix(
  () => 1,
  ({ input }) => input + 1,
  ({ input }) => input + 1,
)
