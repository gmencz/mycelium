FROM golang:1.18-alpine

WORKDIR /app

COPY go.mod ./
COPY go.sum ./

RUN go mod download

COPY cmd cmd
COPY pkg pkg

RUN go build -o /mycelium ./cmd/start
EXPOSE 8080

CMD [ "/mycelium" ]