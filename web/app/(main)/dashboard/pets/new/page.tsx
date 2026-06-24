import { NewPetForm } from "./new-form"

export const metadata = {
  title: "添加宠物 — PetRWD",
}

export default function NewPetPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-[28px] font-semibold leading-[1.1] tracking-normal text-[#111111]">
          添加宠物
        </h1>
        <p className="mt-2 text-[14px] text-[#6B6B6B]">创建一份新的宠物档案</p>
      </div>
      <NewPetForm />
    </div>
  )
}
