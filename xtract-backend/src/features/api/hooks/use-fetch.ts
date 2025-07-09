"use client";

import React from "react";
import { FetchInit, FetchInput } from "@/types/fetch-params";

export function useFetch() {
  return React.useCallback(
    async (input: FetchInput, init?: FetchInit): Promise<Response> => {
      let headers: HeadersInit = {};

      if (!(init?.body instanceof FormData)) {
        headers = {
          ...headers,
          "Content-Type": "application/json",
        };
      }

      const combinedHeaders = new Headers({ ...headers, ...init?.headers });

      return fetch(input, {
        ...init,
        headers: combinedHeaders,
      });
    },
    []
  );
} 