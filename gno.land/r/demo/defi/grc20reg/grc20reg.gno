package grc20reg

import (
	"chain"
	"strconv"
	"strings"

	"gno.land/p/demo/tokens/grc20"
	"gno.land/p/nt/avl/v0"
	"gno.land/p/nt/fqname/v0"
)

var registry = avl.Tree{}

const (
	registerEvent = "register"
	maxSlugLen    = 128
)

func Register(cur realm, token *grc20.Token, slug string) string {
	if token == nil {
		panic("grc20reg: nil token")
	}
	if slug != "" {
		validateSlug(slug)
	}
	rlmPath := cur.Previous().PkgPath()
	key := fqname.Construct(rlmPath, token.GetSymbol())
	if !strings.HasPrefix(token.ID(), key+".") {
		panic("grc20reg: token must be registered from its own realm")
	}
	if registry.Has(key) {
		panic("grc20reg: token already registered")
	}
	registry.Set(key, token)
	chain.Emit(
		registerEvent,
		"token_path", key,
		"pkgpath", rlmPath,
		"slug", slug,
		"symbol", token.GetSymbol(),
	)
	return key
}

func Get(key string) *grc20.Token {
	token := registry.Get(key)
	if token == nil {
		return nil
	}
	return token.(*grc20.Token)
}

func MustGet(key string) *grc20.Token {
	token := Get(key)
	if token == nil {
		panic("unknown token: " + key)
	}
	return token
}

// Snapshot lists registered GRC20s, one per line: key;symbol;name;decimals
func Snapshot() string {
	out := ""
	registry.Iterate("", "", func(k string, v any) bool {
		t := v.(*grc20.Token)
		line := k + ";" + t.GetSymbol() + ";" + t.GetName() + ";" + strconv.Itoa(t.GetDecimals())
		if out != "" {
			out += "\n"
		}
		out += line
		return false
	})
	return out
}

func Transfer(cur realm, tokenKey string, to address, amount int64) {
	checkErr(MustGet(tokenKey).CallerTeller().Transfer(0, cur, to, amount))
}

func Approve(cur realm, tokenKey string, spender address, amount int64) {
	checkErr(MustGet(tokenKey).CallerTeller().Approve(0, cur, spender, amount))
}

func TransferFrom(cur realm, tokenKey string, from, to address, amount int64) {
	checkErr(MustGet(tokenKey).CallerTeller().TransferFrom(0, cur, from, to, amount))
}

func checkErr(err error) {
	if err != nil {
		panic(err)
	}
}

func validateSlug(slug string) {
	if len(slug) > maxSlugLen {
		panic("grc20reg: slug too long")
	}
	for _, c := range slug {
		if !isAlphanumeric(c) && c != '_' && c != '-' {
			panic("grc20reg: invalid slug character: " + string(c))
		}
	}
}

func isAlphanumeric(c rune) bool {
	return (c >= 'a' && c <= 'z') || (c >= 'A' && c <= 'Z') || (c >= '0' && c <= '9')
}
