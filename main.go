package main

import (
    "fmt"
    "net/http"

    "google.golang.org/appengine"
)

func main() {
    http.HandleFunc("/", handler)
    appengine.Main()
}

func handler(w http.ResponseWriter, r *http.Request) {
    fmt.Fprint(w, "Dsouza CDN")
}
