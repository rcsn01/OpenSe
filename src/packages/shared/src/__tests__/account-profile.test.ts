import { describe, expect, it } from 'vitest'
import {
  getCurrentAccountProfileSummary,
  getProfileInitials,
} from '../account-profile'

describe('account profile summary', () => {
  it('uses profile row avatar, name, email, and initials first', () => {
    expect(
      getCurrentAccountProfileSummary({
        profile: {
          id: 'profile-1',
          email: 'profile@example.com',
          full_name: 'Jane Lane',
          username: 'janelane',
          avatar_url: 'https://example.com/avatar.png',
        },
        user: {
          id: 'user-1',
          email: 'auth@example.com',
          user_metadata: {
            full_name: 'Auth User',
            avatar_url: 'https://example.com/auth.png',
          },
        },
      }),
    ).toMatchObject({
      id: 'profile-1',
      email: 'profile@example.com',
      displayName: 'Jane Lane',
      username: 'janelane',
      profileSrc: 'https://example.com/avatar.png',
      profileFallback: 'JL',
    })
  })

  it('falls back to auth metadata when profile fields are missing', () => {
    expect(
      getCurrentAccountProfileSummary({
        profile: null,
        user: {
          id: 'user-1',
          email: 'auth@example.com',
          user_metadata: {
            full_name: 'Auth User',
            username: 'authuser',
            picture: 'https://example.com/picture.png',
          },
        },
      }),
    ).toMatchObject({
      id: 'user-1',
      email: 'auth@example.com',
      displayName: 'Auth User',
      username: 'authuser',
      profileSrc: 'https://example.com/picture.png',
      profileFallback: 'AU',
    })
  })

  it('falls back to email local part and default initials', () => {
    expect(
      getCurrentAccountProfileSummary({
        user: {
          id: 'user-1',
          email: 'operator@example.com',
          user_metadata: {},
        },
      }),
    ).toMatchObject({
      displayName: 'operator',
      profileFallback: 'O',
    })

    expect(getCurrentAccountProfileSummary({}).profileFallback).toBe('U')
  })

  it('derives initials from names and single fallback values', () => {
    expect(getProfileInitials('Jane Lane')).toBe('JL')
    expect(getProfileInitials('operator@example.com')).toBe('O')
    expect(getProfileInitials('')).toBe('U')
  })
})
