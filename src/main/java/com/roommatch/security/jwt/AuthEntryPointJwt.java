package com.roommatch.security.jwt;

import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.security.core.AuthenticationException;
import org.springframework.security.web.AuthenticationEntryPoint;
import org.springframework.stereotype.Component;

import java.io.IOException;

@Component
public class AuthEntryPointJwt implements AuthenticationEntryPoint {

    private static final Logger logger = LoggerFactory.getLogger(AuthEntryPointJwt.class);

    @Override
    public void commence(HttpServletRequest request, HttpServletResponse response,
                         AuthenticationException authException) throws IOException, ServletException {
        System.out.println("AuthEntryPointJwt: Unauthorized error. URL: " + request.getRequestURI() + ", Msg: " + authException.getMessage());
        logger.error("Unauthorized error. URL: {}, Message: {}", request.getRequestURI(), authException.getMessage());
        authException.printStackTrace();
        response.setContentType(org.springframework.http.MediaType.APPLICATION_JSON_VALUE);
        response.setStatus(HttpServletResponse.SC_UNAUTHORIZED);
        response.getWriter().write(new com.fasterxml.jackson.databind.ObjectMapper().writeValueAsString(java.util.Collections.singletonMap("error", "Unauthorized: " + authException.getMessage())));
    }
}
