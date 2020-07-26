export default async (context) => {
  context.n()
  return ({ n }) => n
}