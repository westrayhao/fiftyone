FROM ubuntu:20.04

RUN apt update 
RUN apt install python3-pip -y
RUN update-alternatives --install /usr/bin/python python /usr/bin/python3.8 1 
RUN update-alternatives --install /usr/bin/pip pip /usr/bin/pip3 1
RUN apt-get install git -y
RUN apt install curl -y 
RUN apt install vim -y

RUN git clone --recursive https://github.com/westrayhao/fiftyone.git
WORKDIR ./fiftyone
RUN bash install.bash 
WORKDIR ../workspace
