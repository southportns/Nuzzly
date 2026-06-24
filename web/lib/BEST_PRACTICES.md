/**
 * 统一错误处理和验证的最佳实践
 * 
 * 本文档展示如何在API路由中使用统一的错误处理、验证和类型系统
 */

// ============================================================================
// 案例 1: API 路由 - 查询用户列表 (带搜索和分页)
// ============================================================================

import { NextRequest, NextResponse } from "next/server"
import { listUsers } from "@/lib/supabase/queries/admin-queries"
import { validateAdminFilter } from "@/lib/validation"
import { apiResponse, notFoundError } from "@/lib/error-handling"

export async function GET(request: NextRequest) {
  try {
    // 1. 提取并验证查询参数
    const search = request.nextUrl.searchParams.get("search") || undefined
    const limit = request.nextUrl.searchParams.get("limit")
      ? parseInt(request.nextUrl.searchParams.get("limit")!, 10)
      : undefined
    const offset = request.nextUrl.searchParams.get("offset")
      ? parseInt(request.nextUrl.searchParams.get("offset")!, 10)
      : undefined

    // 2. 使用验证工具验证输入
    const validation = validateAdminFilter({ search, limit, offset })

    if (!validation.isValid) {
      return NextResponse.json(
        {
          ok: false,
          error: {
            code: "VALIDATION_ERROR",
            message: "Invalid parameters",
            details: validation.errors,
          },
        },
        { status: 400 }
      )
    }

    // 3. 执行查询（已自动处理错误）
    const { data: users, error } = await listUsers({
      search: validation.data!.search,
      limit: validation.data!.limit,
    })

    if (error) {
      return NextResponse.json(
        {
          ok: false,
          error: {
            code: "DB_ERROR",
            message: error.message || "Failed to fetch users",
          },
        },
        { status: 500 }
      )
    }

    // 4. 返回标准响应
    return NextResponse.json({
      ok: true,
      data: users,
      pagination: {
        limit: validation.data!.limit,
        offset: validation.data!.offset || 0,
      },
    })
  } catch (err) {
    console.error("[GET /api/admin/users] Error:", err)
    return NextResponse.json(
      {
        ok: false,
        error: {
          code: "INTERNAL_ERROR",
          message: "Internal server error",
        },
      },
      { status: 500 }
    )
  }
}

// ============================================================================
// 案例 2: 表单数据验证和提交
// ============================================================================

import { Validators } from "@/lib/validation"

export async function POST(request: NextRequest) {
  try {
    // 1. 解析请求体
    const body = await request.json()

    // 2. 逐字段验证（防止SQL注入）
    const [isValidEmail, emailErr] = Validators.email(body.email)
    if (!isValidEmail) {
      return NextResponse.json(
        {
          ok: false,
          error: { code: "VALIDATION_ERROR", message: emailErr, field: "email" },
        },
        { status: 400 }
      )
    }

    const [isValidName, nameErr] = Validators.string(body.name, { min: 1, max: 100 })
    if (!isValidName) {
      return NextResponse.json(
        {
          ok: false,
          error: { code: "VALIDATION_ERROR", message: nameErr, field: "name" },
        },
        { status: 400 }
      )
    }

    const [isValidRating, ratingErr] = Validators.rating(body.rating)
    if (!isValidRating) {
      return NextResponse.json(
        {
          ok: false,
          error: { code: "VALIDATION_ERROR", message: ratingErr, field: "rating" },
        },
        { status: 400 }
      )
    }

    // 3. 数据已验证，可以安全使用
    // ... 执行操作 ...

    return NextResponse.json({ ok: true, data: { /* result */ } })
  } catch (err) {
    console.error("[POST /api/users] Error:", err)
    return NextResponse.json(
      {
        ok: false,
        error: {
          code: "INTERNAL_ERROR",
          message: "Internal server error",
        },
      },
      { status: 500 }
    )
  }
}

// ============================================================================
// 案例 3: 使用类型安全的 RPC 调用
// ============================================================================

// 之前（不安全）:
// const { data, error } = await (supabase as any).rpc("some_function", params)

// 之后（类型安全）:
// import { createRPCCaller } from "@/lib/supabase/rpc-types"
// const rpc = createRPCCaller(supabase)
// const { data, error } = await rpc.getProductTimelineStats(productId)

// ============================================================================
// 验证工具速查
// ============================================================================

// 文字类字段
const [isValid, error] = Validators.string(value, { min: 1, max: 255 })

// 数字类字段
const [isValid, error] = Validators.number(value, { min: 0, max: 100, integer: true })

// 搜索字符串（自动防SQL注入）
const [isValid, error] = Validators.search(value)

// 邮件地址
const [isValid, error] = Validators.email(value)

// UUID
const [isValid, error] = Validators.uuid(value)

// 1-5评分
const [isValid, error] = Validators.rating(value)

// ISO日期
const [isValid, error] = Validators.date(value)

// 布尔值
const [isValid, error] = Validators.boolean(value)

// 枚举
const [isValid, error] = Validators.enum(value, ["active", "inactive"])

// 数组
const [isValid, error] = Validators.array(value, { minLength: 1, maxLength: 100 })

// ============================================================================
// 错误处理工具速查
// ============================================================================

import { apiResponse, validationError, authorizationError, notFoundError } from "@/lib/error-handling"

// 验证错误
const error = validationError("email", "Invalid email format")

// 授权错误
const error = authorizationError("admin_panel")

// 未找到
const error = notFoundError("User", userId)

// 标准API响应
const response = apiResponse({ data: result, error: null })
// => { ok: true, data: result, error: null, statusCode: 200 }
