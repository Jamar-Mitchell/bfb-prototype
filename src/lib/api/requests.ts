import type { AxiosRequestConfig } from 'axios'

import { apiClient } from './client'
import type { paths } from './schema'

/**
 * Typed request helpers over `apiClient`, keyed by the generated OpenAPI `paths`.
 *
 * The OpenAPI document lists routes with the `/api/v1` prefix, but `apiClient`'s
 * base URL already ends in `/api/v1`. Helpers therefore take the route without
 * the prefix: `apiGet('/health')` is typed from `paths['/api/v1/health']['get']`.
 *
 * Helpers resolve with the response body. Errors are rejected unchanged, for the
 * shared error mapping to handle.
 */

export const API_PREFIX = '/api/v1'
type ApiPrefix = typeof API_PREFIX

export type HttpMethod = 'get' | 'post' | 'put' | 'patch' | 'delete'

type IsNever<T> = [T] extends [never] ? true : false

/** Routes (without `/api/v1`) of `Paths` that define method `M`. */
export type RouteOf<Paths, M extends HttpMethod> = {
  [P in keyof Paths]: P extends `${ApiPrefix}${infer Route}`
    ? Paths[P] extends Record<M, object>
      ? Route
      : never
    : never
}[keyof Paths]

/** The OpenAPI operation for method `M` on `Route`. */
export type OperationOf<Paths, M extends HttpMethod, Route extends string> =
  `${ApiPrefix}${Route}` extends keyof Paths
    ? Paths[`${ApiPrefix}${Route}`] extends Record<M, infer Op>
      ? Op
      : never
    : never

type SuccessStatus = 200 | 201 | 202 | 203 | 204

type JsonBody<Response> = Response extends { content: { 'application/json': infer Body } }
  ? Body
  : undefined

/** JSON body of the operation's success response (`undefined` for 204 and similar). */
export type ResponseOf<Op> = Op extends { responses: infer Responses }
  ? JsonBody<Responses[Extract<keyof Responses, SuccessStatus>]>
  : never

/** JSON request body of the operation, or `never` if it takes none. */
export type RequestBodyOf<Op> = Op extends { requestBody?: infer RequestBody }
  ? JsonRequestBody<RequestBody>
  : never

// Distributes over the union, so `requestBody?: never` yields `never`.
type JsonRequestBody<RequestBody> = RequestBody extends {
  content: { 'application/json': infer Body }
}
  ? Body
  : never

type ParametersOf<Op> = Op extends { parameters: infer Parameters } ? Parameters : never
type PathParamsOf<Op> = ParametersOf<Op> extends { path: infer Path } ? Path : never
type QueryParamsOf<Op> = ParametersOf<Op> extends { query?: infer Query } ? Query : never

type BaseConfig = Omit<AxiosRequestConfig, 'url' | 'method' | 'data' | 'params'>

export type RequestOptions<Op> = BaseConfig &
  (IsNever<PathParamsOf<Op>> extends true ? { path?: never } : { path: PathParamsOf<Op> }) &
  (IsNever<Exclude<QueryParamsOf<Op>, undefined>> extends true
    ? { query?: never }
    : { query?: QueryParamsOf<Op> })

/** Options are required only when the route has path parameters. */
export type OptionsArgs<Op> =
  IsNever<PathParamsOf<Op>> extends true
    ? [options?: RequestOptions<Op>]
    : [options: RequestOptions<Op>]

/** Body is required when the operation declares a required JSON body. */
export type BodyArgs<Op> =
  IsNever<RequestBodyOf<Op>> extends true
    ? [body?: undefined, ...options: OptionsArgs<Op>]
    : Op extends { requestBody: object }
      ? [body: RequestBodyOf<Op>, ...options: OptionsArgs<Op>]
      : [body?: RequestBodyOf<Op>, ...options: OptionsArgs<Op>]

/** Replaces `{name}` segments with URL-encoded values from `params`. */
export function fillPath(route: string, params?: Record<string, string | number>): string {
  return route.replace(/\{([^}]+)\}/g, (_segment, name: string) => {
    const value = params?.[name]

    if (value === undefined) {
      throw new Error(`Missing path parameter "${name}" for ${route}`)
    }

    return encodeURIComponent(String(value))
  })
}

type AnyOptions = BaseConfig & {
  path?: Record<string, string | number>
  query?: unknown
}

async function send<T>(
  method: HttpMethod,
  route: string,
  body: unknown,
  options: AnyOptions | undefined,
): Promise<T> {
  const { path, query, ...config } = options ?? {}
  const response = await apiClient.request<T>({
    ...config,
    method,
    url: fillPath(route, path),
    params: query,
    data: body,
  })

  return response.data
}

type Op<M extends HttpMethod, Route extends string> = OperationOf<paths, M, Route>

export function apiGet<Route extends RouteOf<paths, 'get'>>(
  route: Route,
  ...[options]: OptionsArgs<Op<'get', Route>>
): Promise<ResponseOf<Op<'get', Route>>> {
  return send('get', route, undefined, options as AnyOptions | undefined)
}

export function apiDelete<Route extends RouteOf<paths, 'delete'>>(
  route: Route,
  ...[options]: OptionsArgs<Op<'delete', Route>>
): Promise<ResponseOf<Op<'delete', Route>>> {
  return send('delete', route, undefined, options as AnyOptions | undefined)
}

export function apiPost<Route extends RouteOf<paths, 'post'>>(
  route: Route,
  ...[body, options]: BodyArgs<Op<'post', Route>>
): Promise<ResponseOf<Op<'post', Route>>> {
  return send('post', route, body, options as AnyOptions | undefined)
}

export function apiPut<Route extends RouteOf<paths, 'put'>>(
  route: Route,
  ...[body, options]: BodyArgs<Op<'put', Route>>
): Promise<ResponseOf<Op<'put', Route>>> {
  return send('put', route, body, options as AnyOptions | undefined)
}

export function apiPatch<Route extends RouteOf<paths, 'patch'>>(
  route: Route,
  ...[body, options]: BodyArgs<Op<'patch', Route>>
): Promise<ResponseOf<Op<'patch', Route>>> {
  return send('patch', route, body, options as AnyOptions | undefined)
}
