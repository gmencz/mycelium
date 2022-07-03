package common

import (
	"errors"
	"regexp"
	"strings"
)

func Filter[T any](slice []T, f func(T) bool) []T {
	n := make([]T, 0)

	for _, e := range slice {
		if f(e) {
			n = append(n, e)
		}
	}

	return n
}

func Map[T any](slice []T, f func(v T) T) []T {
	mapped := make([]T, 0)

	for _, e := range slice {
		mapped = append(mapped, f(e))
	}

	return mapped
}

func Some[T any](slice []T, f func(T) bool) bool {
	for _, e := range slice {
		if f(e) {
			return true
		}
	}

	return false
}

func ParseAuthorizationHeader(header string) (string, error) {
	isBearerFormat := strings.HasPrefix(header, "Bearer ")
	if !isBearerFormat {
		return "", errors.New("invalid authorization header")
	}

	token := header[7:]
	return token, nil
}

func RemoveDuplicateStrings(strings []string) []string {
	allKeys := make(map[string]bool)
	list := make([]string, 0)
	for _, item := range strings {
		if _, value := allKeys[item]; !value {
			allKeys[item] = true
			list = append(list, item)
		}
	}
	return list
}

func ValidateString(s string) bool {
	match, _ := regexp.MatchString("^[a-zA-Z0-9_-]+$", s)
	sLen := len(s)
	if match && sLen >= 1 && sLen <= 255 {
		return true
	}

	return false
}
