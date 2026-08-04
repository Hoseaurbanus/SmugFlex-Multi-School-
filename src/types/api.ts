// API Response Types for SMugFlex 2.0

export interface ApiResponse<T = unknown> {
  success: boolean;
  message?: string;
  data: T;
  status: number;
  timestamp: string;
}

export interface PaginatedResponse<T = unknown> extends ApiResponse<T[]> {
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface ApiError {
  success: false;
  message: string;
  status: number;
  errors?: Record<string, string[]>;
}

export interface LoginResponse {
  token: string;
  user: {
    id: number;
    username: string;
    role: string;
    school_id: number;
    linked_id?: number;
  };
}

export interface QueryResult<T = Record<string, unknown>> {
  data?: T[];
  insertId?: number;
  affectedRows?: number;
  message?: string;
}

export interface PaginationParams {
  page?: number;
  limit?: number;
  offset?: number;
  search?: string;
  role?: string;
  status?: string;
}
