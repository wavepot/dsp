export default async (context) => {
  await new Promise(resolve => setTimeout(resolve, 100))
  return ({ n }) => n
}
