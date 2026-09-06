package fqname

import "strings"

func Parse(fqname string) (pkgpath, name string) {
	lastSlashIndex := strings.LastIndex(fqname, "/")
	if lastSlashIndex == -1 {
		dotIndex := strings.LastIndex(fqname, ".")
		if dotIndex == -1 {
			return fqname, ""
		}
		return fqname[:dotIndex], fqname[dotIndex+1:]
	}
	afterSlash := fqname[lastSlashIndex+1:]
	dotIndex := strings.Index(afterSlash, ".")
	if dotIndex == -1 {
		return fqname, ""
	}
	base := fqname[:lastSlashIndex+1+dotIndex]
	suffix := afterSlash[dotIndex+1:]
	return base, suffix
}

func Construct(pkgpath, name string) string {
	if name == "" {
		return pkgpath
	}
	return pkgpath + "." + name
}
