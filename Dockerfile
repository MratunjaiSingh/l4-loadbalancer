FROM alpine:latest

RUN apk update && \
    apk add --no-cache g++ cmake make boost-dev

WORKDIR /app

COPY . .

RUN mkdir build && cd build && cmake .. && make

EXPOSE 8080

CMD ["./build/load_balancer"]